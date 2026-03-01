#!/usr/bin/env node
/**
 * MapYourHealth E2E Test Monitor & Reporter
 * Provides real-time test execution monitoring and comprehensive reporting
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class TestMonitor {
    constructor(options = {}) {
        this.projectRoot = options.projectRoot || path.join(__dirname, '..');
        this.testResultsDir = options.testResultsDir || path.join(this.projectRoot, 'test-results');
        this.outputFormat = options.outputFormat || 'json';
        this.enableNotifications = options.enableNotifications || false;
        this.aiQueueUrl = options.aiQueueUrl || 'http://localhost:3001';
        
        // Ensure directories exist
        this.ensureDirectories();
        
        // Test execution state
        this.state = {
            currentSuite: null,
            startTime: null,
            tests: new Map(),
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                successRate: 0
            }
        };
    }
    
    ensureDirectories() {
        const dirs = [
            this.testResultsDir,
            path.join(this.testResultsDir, 'reports'),
            path.join(this.testResultsDir, 'monitoring'),
            path.join(this.testResultsDir, 'historical')
        ];
        
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const colors = {
            info: '\x1b[36m',    // Cyan
            success: '\x1b[32m', // Green
            warning: '\x1b[33m', // Yellow
            error: '\x1b[31m',   // Red
            reset: '\x1b[0m'
        };
        
        const color = colors[level] || colors.info;
        console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
        
        // Also log to file
        const logFile = path.join(this.testResultsDir, 'monitoring', 'test-monitor.log');
        fs.appendFileSync(logFile, `[${timestamp}] [${level.toUpperCase()}] ${message}\n`);
    }
    
    startSuite(suiteName, platform = 'unknown') {
        this.state.currentSuite = suiteName;
        this.state.startTime = new Date();
        this.state.platform = platform;
        
        this.log(`Starting test suite: ${suiteName} on ${platform}`, 'info');
        
        // Reset state
        this.state.tests.clear();
        this.state.summary = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            successRate: 0
        };
        
        this.saveState();
    }
    
    recordTestStart(testName) {
        const test = {
            name: testName,
            status: 'running',
            startTime: new Date(),
            endTime: null,
            duration: null,
            error: null
        };
        
        this.state.tests.set(testName, test);
        this.log(`Test started: ${testName}`, 'info');
        this.saveState();
    }
    
    recordTestEnd(testName, status, error = null) {
        const test = this.state.tests.get(testName);
        if (!test) {
            this.log(`Warning: Test ${testName} not found in state`, 'warning');
            return;
        }
        
        test.status = status;
        test.endTime = new Date();
        test.duration = test.endTime - test.startTime;
        test.error = error;
        
        // Update summary
        this.state.summary.total++;
        if (status === 'passed') {
            this.state.summary.passed++;
        } else if (status === 'failed') {
            this.state.summary.failed++;
        } else {
            this.state.summary.skipped++;
        }
        
        this.state.summary.successRate = this.state.summary.total > 0 
            ? Math.round((this.state.summary.passed / this.state.summary.total) * 100)
            : 0;
        
        const level = status === 'passed' ? 'success' : (status === 'failed' ? 'error' : 'warning');
        const duration = test.duration ? `(${Math.round(test.duration / 1000)}s)` : '';
        this.log(`Test ${status}: ${testName} ${duration}`, level);
        
        this.saveState();
    }
    
    finishSuite() {
        if (!this.state.currentSuite) {
            this.log('No active test suite to finish', 'warning');
            return;
        }
        
        const endTime = new Date();
        const totalDuration = endTime - this.state.startTime;
        
        this.log(`Test suite completed: ${this.state.currentSuite}`, 'success');
        this.log(`Total duration: ${Math.round(totalDuration / 1000)}s`, 'info');
        this.log(`Results: ${this.state.summary.passed}/${this.state.summary.total} passed (${this.state.summary.successRate}%)`, 'info');
        
        // Generate final report
        this.generateReport();
        
        // Send notifications if enabled
        if (this.enableNotifications) {
            this.sendNotifications();
        }
        
        // Archive results
        this.archiveResults();
    }
    
    saveState() {
        const stateFile = path.join(this.testResultsDir, 'monitoring', 'current-state.json');
        const stateData = {
            ...this.state,
            tests: Array.from(this.state.tests.entries())
        };
        
        fs.writeFileSync(stateFile, JSON.stringify(stateData, null, 2));
    }
    
    loadState() {
        const stateFile = path.join(this.testResultsDir, 'monitoring', 'current-state.json');
        
        if (fs.existsSync(stateFile)) {
            try {
                const stateData = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
                this.state = {
                    ...stateData,
                    tests: new Map(stateData.tests || [])
                };
                this.log('State loaded from file', 'info');
            } catch (error) {
                this.log(`Failed to load state: ${error.message}`, 'error');
            }
        }
    }
    
    generateReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = path.join(this.testResultsDir, 'reports', `test-report-${timestamp}.${this.outputFormat}`);
        
        const report = {
            metadata: {
                suite: this.state.currentSuite,
                platform: this.state.platform,
                startTime: this.state.startTime,
                endTime: new Date(),
                totalDuration: new Date() - this.state.startTime,
                generatedAt: new Date().toISOString()
            },
            summary: this.state.summary,
            tests: Array.from(this.state.tests.values()).map(test => ({
                name: test.name,
                status: test.status,
                duration: test.duration,
                error: test.error
            })),
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                cwd: process.cwd()
            }
        };
        
        if (this.outputFormat === 'json') {
            fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        } else if (this.outputFormat === 'html') {
            const html = this.generateHtmlReport(report);
            fs.writeFileSync(reportFile.replace('.json', '.html'), html);
        }
        
        // Also generate a markdown summary
        const markdownFile = reportFile.replace(`.${this.outputFormat}`, '.md');
        const markdown = this.generateMarkdownReport(report);
        fs.writeFileSync(markdownFile, markdown);
        
        this.log(`Report generated: ${reportFile}`, 'success');
        
        return report;
    }
    
    generateHtmlReport(report) {
        const passedTests = report.tests.filter(t => t.status === 'passed');
        const failedTests = report.tests.filter(t => t.status === 'failed');
        const skippedTests = report.tests.filter(t => t.status === 'skipped');
        
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MapYourHealth E2E Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .metric { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #007bff; }
        .metric.success { border-color: #28a745; }
        .metric.warning { border-color: #ffc107; }
        .metric.danger { border-color: #dc3545; }
        .test-list { background: white; padding: 20px; border-radius: 8px; }
        .test-item { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .test-item.passed { background: #d4edda; border-left: 4px solid #28a745; }
        .test-item.failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .test-item.skipped { background: #fff3cd; border-left: 4px solid #ffc107; }
        .duration { font-size: 0.9em; color: #6c757d; }
        .error { font-family: monospace; font-size: 0.8em; color: #dc3545; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 MapYourHealth E2E Test Report</h1>
        <p><strong>Suite:</strong> ${report.metadata.suite}</p>
        <p><strong>Platform:</strong> ${report.metadata.platform}</p>
        <p><strong>Duration:</strong> ${Math.round(report.metadata.totalDuration / 1000)}s</p>
        <p><strong>Generated:</strong> ${new Date(report.metadata.generatedAt).toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>Total Tests</h3>
            <h2>${report.summary.total}</h2>
        </div>
        <div class="metric success">
            <h3>Passed</h3>
            <h2>${report.summary.passed}</h2>
        </div>
        <div class="metric danger">
            <h3>Failed</h3>
            <h2>${report.summary.failed}</h2>
        </div>
        <div class="metric warning">
            <h3>Success Rate</h3>
            <h2>${report.summary.successRate}%</h2>
        </div>
    </div>
    
    <div class="test-list">
        <h2>Test Results</h2>
        ${report.tests.map(test => `
            <div class="test-item ${test.status}">
                <strong>${test.name}</strong>
                <span class="duration">${test.duration ? Math.round(test.duration / 1000) + 's' : ''}</span>
                ${test.error ? `<div class="error">${test.error}</div>` : ''}
            </div>
        `).join('')}
    </div>
    
    ${failedTests.length > 0 ? `
    <div class="test-list">
        <h2>❌ Failed Tests (${failedTests.length})</h2>
        ${failedTests.map(test => `
            <div class="test-item failed">
                <strong>${test.name}</strong>
                <span class="duration">${test.duration ? Math.round(test.duration / 1000) + 's' : ''}</span>
                ${test.error ? `<div class="error">${test.error}</div>` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}
</body>
</html>`;
    }
    
    generateMarkdownReport(report) {
        const failedTests = report.tests.filter(t => t.status === 'failed');
        
        return `# 🧪 MapYourHealth E2E Test Report

## Summary
- **Suite:** ${report.metadata.suite}
- **Platform:** ${report.metadata.platform}  
- **Duration:** ${Math.round(report.metadata.totalDuration / 1000)}s
- **Generated:** ${new Date(report.metadata.generatedAt).toLocaleString()}

## Results
| Metric | Value |
|--------|-------|
| Total Tests | ${report.summary.total} |
| Passed | ${report.summary.passed} ✅ |
| Failed | ${report.summary.failed} ❌ |
| Success Rate | ${report.summary.successRate}% |

## Test Details
${report.tests.map(test => {
    const status = test.status === 'passed' ? '✅' : (test.status === 'failed' ? '❌' : '⏭️');
    const duration = test.duration ? ` (${Math.round(test.duration / 1000)}s)` : '';
    return `- ${status} ${test.name}${duration}`;
}).join('\n')}

${failedTests.length > 0 ? `
## ❌ Failed Tests
${failedTests.map(test => `
### ${test.name}
- **Duration:** ${test.duration ? Math.round(test.duration / 1000) + 's' : 'N/A'}
- **Error:** ${test.error || 'No error details'}
`).join('\n')}
` : ''}

---
*Generated by MapYourHealth Test Monitor*`;
    }
    
    async sendNotifications() {
        const summary = this.state.summary;
        
        // AI Queue System notification
        try {
            const message = `🧪 MapYourHealth E2E Test Results
            
**Suite:** ${this.state.currentSuite}
**Platform:** ${this.state.platform}
**Results:** ${summary.passed}/${summary.total} passed (${summary.successRate}%)
${summary.failed > 0 ? `**Failed Tests:** ${summary.failed}` : ''}

${summary.successRate < 80 ? '⚠️ Low success rate - investigation needed' : '✅ Tests passing normally'}`;

            await fetch(`${this.aiQueueUrl}/api/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    type: 'e2e_results',
                    priority: summary.failed > 0 ? 'high' : 'normal',
                    metadata: {
                        suite: this.state.currentSuite,
                        platform: this.state.platform,
                        successRate: summary.successRate,
                        failedCount: summary.failed
                    }
                })
            });
            
            this.log('Notification sent to AI Queue system', 'success');
        } catch (error) {
            this.log(`Failed to send AI Queue notification: ${error.message}`, 'warning');
        }
    }
    
    archiveResults() {
        const timestamp = new Date().toISOString().split('T')[0];
        const archiveDir = path.join(this.testResultsDir, 'historical', timestamp);
        
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }
        
        // Copy current results to archive
        const reportFiles = fs.readdirSync(path.join(this.testResultsDir, 'reports'))
            .filter(file => file.includes(new Date().toISOString().split('T')[0]));
        
        reportFiles.forEach(file => {
            const src = path.join(this.testResultsDir, 'reports', file);
            const dest = path.join(archiveDir, file);
            fs.copyFileSync(src, dest);
        });
        
        this.log(`Results archived to: ${archiveDir}`, 'info');
    }
    
    // Real-time monitoring methods
    watchTestExecution(testRunnerProcess) {
        this.log('Starting real-time test monitoring', 'info');
        
        testRunnerProcess.stdout.on('data', (data) => {
            const output = data.toString();
            this.parseTestOutput(output);
        });
        
        testRunnerProcess.stderr.on('data', (data) => {
            const output = data.toString();
            this.parseTestOutput(output);
        });
        
        testRunnerProcess.on('exit', (code) => {
            this.log(`Test runner exited with code: ${code}`, code === 0 ? 'success' : 'error');
            this.finishSuite();
        });
    }
    
    parseTestOutput(output) {
        const lines = output.split('\n');
        
        lines.forEach(line => {
            // Parse test start patterns
            if (line.includes('Running test:')) {
                const match = line.match(/Running test:\s*(.+)/);
                if (match) {
                    this.recordTestStart(match[1].trim());
                }
            }
            
            // Parse test result patterns  
            if (line.includes('Test passed:') || line.includes('✅')) {
                const match = line.match(/Test passed:\s*(.+?)\s*\(/);
                if (match) {
                    this.recordTestEnd(match[1].trim(), 'passed');
                }
            }
            
            if (line.includes('Test failed:') || line.includes('❌')) {
                const match = line.match(/Test failed:\s*(.+?)\s*\(/);
                if (match) {
                    this.recordTestEnd(match[1].trim(), 'failed', line);
                }
            }
        });
    }
    
    // CLI interface
    static cli() {
        const args = process.argv.slice(2);
        const command = args[0];
        
        const monitor = new TestMonitor({
            enableNotifications: args.includes('--notifications'),
            outputFormat: args.includes('--html') ? 'html' : 'json'
        });
        
        switch (command) {
            case 'start':
                const suite = args[1] || 'unknown';
                const platform = args[2] || 'unknown';
                monitor.startSuite(suite, platform);
                break;
                
            case 'finish':
                monitor.loadState();
                monitor.finishSuite();
                break;
                
            case 'report':
                monitor.loadState();
                const report = monitor.generateReport();
                console.log(JSON.stringify(report, null, 2));
                break;
                
            case 'watch':
                const scriptPath = args[1];
                if (!scriptPath) {
                    console.error('Usage: node test-monitor.js watch <script-path> [args...]');
                    process.exit(1);
                }
                
                const scriptArgs = args.slice(2);
                const testProcess = spawn(scriptPath, scriptArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
                
                monitor.startSuite('watched-execution', 'auto-detected');
                monitor.watchTestExecution(testProcess);
                break;
                
            case 'status':
                monitor.loadState();
                console.log('Current Test Execution Status:');
                console.log(`Suite: ${monitor.state.currentSuite || 'None'}`);
                console.log(`Tests: ${monitor.state.summary.total} total, ${monitor.state.summary.passed} passed, ${monitor.state.summary.failed} failed`);
                console.log(`Success Rate: ${monitor.state.summary.successRate}%`);
                break;
                
            default:
                console.log(`
MapYourHealth E2E Test Monitor

Usage: node test-monitor.js <command> [options]

Commands:
  start <suite> <platform>  Start monitoring a test suite
  finish                    Finish current suite and generate report
  report                    Generate report from current state
  watch <script> [args...]  Watch a test script execution
  status                    Show current monitoring status

Options:
  --notifications           Enable AI Queue notifications
  --html                   Generate HTML report instead of JSON

Examples:
  node test-monitor.js start "smoke" "ios"
  node test-monitor.js watch "./e2e-test-runner.sh" --suite smoke
  node test-monitor.js report --html
                `);
                break;
        }
    }
}

// Run CLI if called directly
if (require.main === module) {
    TestMonitor.cli();
}

module.exports = TestMonitor;