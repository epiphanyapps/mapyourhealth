# Guia de Pruebas

## URLs

- **Aplicacion Movil (Web)**: https://app.mapyourhealth.info/
- **Panel de Administracion**: https://admin.mapyourhealth.info/

---

## Pruebas de la Aplicacion Movil

### Buscar por Codigo Postal

Prueba estos codigos postales para ver diferentes condiciones de seguridad:

| Codigo Postal | Ubicacion | Estado | Jurisdiccion | Notas |
|---------------|-----------|--------|--------------|-------|
| **90210** | Beverly Hills, CA | Seguro | US-CA | Niveles bajos de contaminacion |
| **10001** | New York, NY | Advertencia | US-NY | Plomo elevado (12 μg/L) |
| **33139** | Miami Beach, FL | Seguro | US-FL | Niveles normales |
| **60601** | Chicago, IL | Peligro | US-IL | Plomo alto (18 μg/L) + coliformes |
| **98101** | Seattle, WA | Muy Seguro | US-WA | Contaminacion mas baja |

---

## Umbrales Segun Jurisdiccion

La aplicacion ahora usa busqueda de jurisdiccion basada en ubicacion en lugar de limites "US" codificados.

### Ejemplo: Limites de Plomo por Jurisdiccion

| Jurisdiccion | Limite de Plomo (μg/L) | Notas |
|--------------|------------------------|-------|
| OMS | 10 | Estandar global |
| EE.UU. (Federal) | 15 | Nivel de accion EPA |
| US-NY | 15 | Sigue al federal |
| US-CA | 15 | Sigue al federal |
| CA (Canada Federal) | 5 | Mas estricto que EE.UU. |
| CA-QC (Quebec) | 5 | Sigue al federal canadiense |
| UE | 5 | Estandar europeo |

### Pruebas de Deteccion de Jurisdiccion

1. **Codigos postales de EE.UU.** (5 digitos): Detectado como US, estado extraido de metadatos
   - `10001` → NY → jurisdiccion US-NY
   - `90210` → CA → jurisdiccion US-CA

2. **Codigos postales canadienses** (formato A1A 1A1): Detectado como CA, provincia de la primera letra
   - `H2X 1Y6` → QC (H = Quebec) → jurisdiccion CA-QC
   - `M5V 3L9` → ON (M = Ontario) → jurisdiccion CA-ON
   - `V6B 1A1` → BC (V = Columbia Britanica) → jurisdiccion CA-BC

---

## Prefijos de Codigos Postales Canadienses

| Primera Letra | Provincia |
|---------------|-----------|
| A | Terranova y Labrador |
| B | Nueva Escocia |
| C | Isla del Principe Eduardo |
| E | Nuevo Brunswick |
| G, H, J | Quebec |
| K, L, M, N, P | Ontario |
| R | Manitoba |
| S | Saskatchewan |
| T | Alberta |
| V | Columbia Britanica |
| X | Territorios del Noroeste / Nunavut |
| Y | Yukon |

---

## Funcion de Ubicacion GPS

1. Toca el icono de GPS (mira) junto a la barra de busqueda
2. Otorga permiso de ubicacion cuando se solicite
3. Tu codigo postal se completara automaticamente
4. Si no hay datos para tu area, veras "Sin datos aun" con opcion de ser notificado

---

## Usuarios Internacionales

La aplicacion funciona con codigos postales de muchos paises:

| Pais | Ejemplo | Etiqueta |
|------|---------|----------|
| EE.UU. | `90210` | "zip code" |
| Canada | `M5V 3L9` | "postal code" |
| Reino Unido | `SW1A 1AA` | "postcode" |
| Australia | `2000` | "postal code" |
| Alemania | `10115` | "postal code" |

Si no tenemos datos para tu area todavia, puedes registrarte para ser notificado cuando esten disponibles.

---

## Resumen de Datos Sembrados

La base de datos del backend contiene:

- **18 jurisdicciones**: OMS, UE, US, CA + estatales/provinciales (NY, CA, TX, FL, IL, WA, QC, ON, BC, AB, etc.)
- **174 contaminantes**: Parseados de Risks.xlsx
  - 68 pesticidas
  - 48 compuestos organicos (incluyendo PFAS)
  - 29 subproductos de desinfeccion
  - 17 contaminantes radiactivos
  - 10 metales pesados (inorganicos)
  - 2 fertilizantes
- **414 umbrales**: Limites especificos por jurisdiccion

---

## Prueba de la Correccion

### Antes (Error)
Todos los usuarios veian limites federales de EE.UU. sin importar su ubicacion.

### Despues (Corregido)
- Usuario en NYC (10001) → ve umbrales US-NY
- Usuario en Montreal (H2X 1Y6) → ve umbrales CA-QC (limite de plomo mas estricto!)
- Usuario en Beverly Hills (90210) → ve umbrales US-CA

---

## Comandos de Semillas

```bash
# Parsear Risks.xlsx y regenerar seed-data.json
cd packages/backend
yarn parse:excel

# Limpiar y resembrar la base de datos
yarn seed:clear

# Obtener ultimo amplify_outputs.json (despues del despliegue)
cd apps/mobile
yarn amplify:outputs
```

---

## Pruebas del Panel de Administracion

1. **Ver todos los codigos postales**: Visita `/zip-codes`
2. **Ver metricas de seguridad**: Visita `/stats`
3. **Ver codigo postal especifico**: Visita `/zip-codes/10001` (ejemplo NYC)
