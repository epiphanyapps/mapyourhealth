# Guia de Pruebas

## URLs

- **Aplicacion Movil (Web)**: https://app.mapyourhealth.info/
- **Panel de Administracion**: https://mapyourhealth.info/admin/

---

## Pruebas de la Aplicacion Movil

### Buscar por Codigo Postal

Prueba estos codigos postales para ver diferentes condiciones de seguridad:

| Codigo Postal | Ubicacion | Lo que Veras |
|---------------|-----------|--------------|
| 98101 | Seattle, WA | Mayormente seguro (verde) |
| 10001 | New York, NY | Multiples advertencias (amarillo) |
| 60601 | Chicago, IL | Alerta de peligro por plomo (rojo) |
| 33139 | Miami Beach, FL | Peligro de inundacion |
| 85001 | Phoenix, AZ | Peligro de incendio forestal y ozono |
| 90210 | Beverly Hills, CA | Advertencia de incendio forestal |

### Funcion de Ubicacion GPS

1. Toca el icono de GPS (mira) junto a la barra de busqueda
2. Otorga permiso de ubicacion cuando se solicite
3. Tu codigo postal se completara automaticamente
4. Si no hay datos para tu area, veras "Sin datos aun" con opcion de ser notificado

### Usuarios Internacionales

La aplicacion funciona con codigos postales de muchos paises:

| Pais | Ejemplo |
|------|---------|
| EE.UU. | `90210` |
| Canada | `M5V 3L9` |
| Reino Unido | `SW1A 1AA` |
| Australia | `2000` |
| Alemania | `10115` |

- **Usuarios de EE.UU.** ven "zip code"
- **Usuarios de Canada** ven "postal code"
- **Usuarios del Reino Unido** ven "postcode"

Si no tenemos datos para tu area todavia, puedes registrarte para ser notificado cuando esten disponibles.

---

## Datos de Prueba Disponibles

### Ciudades de EE.UU. con Datos (34 codigos postales)

**Ciudades Principales (10)**
- 90210 (Beverly Hills), 10001 (NYC), 33139 (Miami Beach)
- 60601 (Chicago), 98101 (Seattle), 30301 (Atlanta)
- 75201 (Dallas), 85001 (Phoenix), 80202 (Denver), 02101 (Boston)

**Queens, NY (12)**
- 11368, 11356, 11101, 11102, 11354, 11372
- 11373, 11375, 11361, 11432, 11385, 11693

**Manhattan, NY (12)**
- 10002, 10003, 10012, 10013, 10016, 10017
- 10023, 10028, 10029, 10027, 10032, 10038

---

## Pruebas del Panel de Administracion

1. **Ver todos los codigos postales**: Visita `/zip-codes`
2. **Ver metricas de seguridad**: Visita `/stats`
3. **Ver codigo postal especifico**: Visita `/zip-codes/10001` (ejemplo NYC)
