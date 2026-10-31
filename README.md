# Paquete Visual

App web para ópticas que arma el **plan visual completo** de cada paciente, como un plan de tratamiento de dentista: "necesitás esto, esto y esto, ¿con cuál empezamos?".

1. **Receta:** se carga a mano o con una foto que lee la IA. La app la explica en palabras simples.
2. **Anamnesis:** preguntas de hábitos y uso (pantallas, trabajo, manejo, luz, deporte, lentes de contacto…).
3. **Plan, "un anteojo para cada momento":** así como nadie usa el mismo calzado para una fiesta, para correr y para caminar, el plan se arma en dos partes:
   - **Lo esencial: ver bien todo el día.** La prioridad. Si hay varias formas de resolverlo (por ejemplo multifocal, bifocal o dos anteojos), se muestran todas como alternativas válidas.
   - **Opcional y de especialidad,** agrupado por momento: estudiar y pantallas, manejar (día y noche), sol, deporte (deportivo graduado, protector, lentes de contacto, antiparras), salidas y eventos, lectura y hobbies, repuesto.

   Cada sugerencia explica por qué y propone un tipo de cristal. Se marca "empezamos por este" y se genera un texto para WhatsApp.

Es una **orientación**: no calcula precios ni armazones, eso se resuelve en el mostrador. Sirve en el mostrador o como autogestión del paciente (los textos le hablan de vos).

> La app **no hace ni reemplaza exámenes visuales**. Trabaja con la receta del oftalmólogo y lo que cuenta el paciente.

## Usarla

Es un solo archivo: `index.html`. No necesita servidor ni base de datos.

- **En una computadora:** abrí `index.html` con el navegador.
- **En internet:** publicá el repositorio con GitHub Pages (Settings → Pages → rama `main`).

Los datos y la configuración se guardan en el navegador de esa computadora (localStorage).

## Configurar tu óptica

Entrá a **Configuración** dentro de la app:

- Nombre de la óptica, saludo del mensaje de WhatsApp y texto legal.
- **Tipos de cristal y productos** con los nombres que usa tu óptica.
- **Momentos** del día (en el JSON) y a qué momento pertenece cada sugerencia.
- **Sugerencias:** nombre, prioridad y la condición que las hace aparecer.
- **JSON completo:** preguntas, productos, sugerencias, soluciones y motivos. Se puede copiar, descargar e importar para pasarlo a otra computadora.

`config/optica-rodriguez.json` es una configuración de ejemplo completa.

### Condiciones

Las sugerencias, motivos y prioridades usan condiciones simples, sin código:

| Dato | Qué es |
|---|---|
| `add`, `potencia`, `edad`, `receta_meses` | números |
| `lejos`, `miopia`, `hipermetropia`, `astigmatismo`, `anisometropia`, `receta` | sí / no |
| `receta_tipo` | `"anteojos"`, `"lc"` o `"ambos"` |
| el código de cada pregunta | la respuesta (`maneja == "noche"`) o la lista de respuestas (`"pc" in trabajo`) |
| `derivados` | condiciones con nombre propio, definidas en el JSON (`oscurece`, `usa_pc`…) |

Operadores: `and`/`y`, `or`/`o`, `not`/`no`, `in`/`en`, `== != > >= < <=`, paréntesis y listas `["5-8","8+"]`.

Ejemplo: `add > 0 and (lejos or "lejos" in dist)`

### Estructura de una sugerencia

```json
{
  "id": "lejos_cerca",
  "momento": "dia",
  "nombre": "Ver bien de lejos y de cerca",
  "prioridad": "ess",
  "cuando": "add > 0 and (lejos or \"lejos\" in dist)",
  "prioridadSi": [{ "si": "...", "prioridad": "rec" }],
  "motivos": [{ "si": "pantallas == \"8+\"", "texto": "Pasás {pantallas} h por día frente a pantallas." }],
  "soluciones": [
    { "id": "multi", "nombre": "Multifocal", "explicacion": "...",
      "pares": [{ "nombre": "Multifocal", "opciones": ["multi_dig", "multi_aa", "multi"], "destacada": "multi_aa" }] },
    { "id": "dos", "nombre": "Dos anteojos",
      "pares": [
        { "nombre": "Lejos", "opciones": ["digital", "antiage", "blue"],
          "opcionesSi": [{ "si": "oscurece", "opciones": ["transitions", "fotoblue", "foto"], "destacada": "fotoblue" }] },
        { "nombre": "Cerca", "opciones": ["antiage", "blue", "ar"] }
      ] }
  ]
}
```

- `momento`: en qué grupo aparece (`dia`, `trabajo`, `manejo`, `sol`, `deporte`, `salidas`, `cerca`, `repuesto`, o los que definas).
- Prioridades: `ess` (esencial: va en "Lo esencial"), `rec` (recomendado), `opt` (opcional).
- Un par puede tener `si` para aparecer solo cuando corresponde (por ejemplo "De noche" solo si maneja de noche).
- `opciones` son los tipos de cristal que se muestran; `destacada` es el que aparece como "Sugerido".

## Lectura de recetas con IA

- Dentro de Claude (claude.ai) funciona sin configurar nada.
- Instalada en tu sitio: cargá una clave de la API de Anthropic en Configuración. Se guarda solo en ese navegador y nunca se exporta. Usala en computadoras de la óptica, no en equipos públicos.

## Licencia

Copyright (C) 2026 Gabriel Rodriguez.

Este programa es software libre bajo la **GNU Affero General Public License v3.0 o posterior** (ver `LICENSE`). Podés usarlo, modificarlo y compartirlo. Si lo modificás y lo ofrecés a otros como servicio en línea, tenés que publicar el código de tus cambios bajo la misma licencia.

Instalación, carga de catálogo y soporte para ópticas: contactar a Óptica Rodriguez.
