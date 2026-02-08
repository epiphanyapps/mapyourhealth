import { useCallback, useMemo } from "react"
import { Linking, StyleProp, Text, TextStyle } from "react-native"

interface LinkedTextProps {
  /** Text with markdown-style links: [link text](url) */
  text: string
  /** Style for regular text */
  style?: StyleProp<TextStyle>
  /** Style for link text (defaults to underlined with tint color) */
  linkStyle?: StyleProp<TextStyle>
}

interface TextPart {
  type: "text" | "link"
  content: string
  url?: string
}

/**
 * Renders text with inline clickable links.
 * Use markdown-style syntax: [link text](url)
 *
 * Example:
 * <LinkedText text="Visit [Google](https://google.com) for more info." />
 */
export function LinkedText({ text, style, linkStyle }: LinkedTextProps) {
  const handleLinkPress = useCallback((url: string) => {
    Linking.openURL(url).catch((err) => {
      console.error("Failed to open URL:", err)
    })
  }, [])

  // Parse markdown-style links: [text](url)
  const parseText = (input: string): TextPart[] => {
    const parts: TextPart[] = []
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    let lastIndex = 0
    let match

    while ((match = linkRegex.exec(input)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: input.slice(lastIndex, match.index),
        })
      }

      // Add the link
      parts.push({
        type: "link",
        content: match[1],
        url: match[2],
      })

      lastIndex = match.index + match[0].length
    }

    // Add remaining text after the last link
    if (lastIndex < input.length) {
      parts.push({
        type: "text",
        content: input.slice(lastIndex),
      })
    }

    return parts
  }

  const parts = useMemo(() => parseText(text), [text])

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.type === "link" && part.url) {
          return (
            <Text
              key={index}
              style={[{ textDecorationLine: "underline" }, linkStyle]}
              onPress={() => handleLinkPress(part.url!)}
              accessibilityRole="link"
              accessibilityLabel={`Open ${part.content}`}
            >
              {part.content}
            </Text>
          )
        }
        return <Text key={index}>{part.content}</Text>
      })}
    </Text>
  )
}
