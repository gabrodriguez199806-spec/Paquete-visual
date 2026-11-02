# Paquete Visual

App web para ópticas que arma el **plan visual completo** de cada paciente, como un plan de tratamiento de dentista: "necesitás esto, esto y esto, ¿con cuál empezamos?".

1. **Receta:** se carga a mano o con una foto que lee la IA. La app la explica en palabras simples.
2. **Anamnesis:** preguntas de hábitos y uso (pantallas, trabajo, manejo, luz, deporte, lentes de contacto…).
3. **Plan, "un anteojo para cada momento":** así como nadie usa el mismo calzado para una fiesta, para correr y para caminar, el plan se arma en dos partes:
   - **Lo esencial: ver bien todo el día.** La prioridad. Si hay varias formas de resolverlo (por ejemplo multifocal, bifocal o dos anteojos), se muestran todas como alternativas válidas.
   - **Opcional y de especialidad,** agrupado por momento: estudiar y pantallas, manejar (día y noche), sol, deporte (deportivo graduado, protector, lentes de contacto, antiparras), salidas y eventos, lectura y hobbies, repuesto.

   Cada ítem dice **por qué es esencial, muy recomendado u opcional**, con las respuestas del paciente ("Nos dijiste que manejás todos los días"). Recomienda **funciones y tecnologías, sin marcas** (visión simple, antirreflejo, polarizado, control de miopía…): el producto exacto lo elige la óptica según la graduación. Se marca "empezamos por este" y se manda a la óptica por WhatsApp.

   **Recomendaciones con criterio:** las preguntas de frecuencia aparecen solo si corresponden; cada sugerencia opcional suma puntos según las respuestas y la receta, y se muestran las 4 de más puntaje (el resto en "Ver más opciones"). Reglas incluidas: lentes de contacto con más peso si la graduación supera ±0.75; menores de 18 con miopía sin filtro azul; control de miopía (cristal o lente de contacto) recomendado hasta los 12 años y opcional de 13 a 17; alto índice solo desde graduación 6.

Es una **orientación**: no calcula precios ni armazones, eso se resuelve en el mostrador. Sirve en el mostrador o como autogestión del paciente (los textos le hablan de vos).

> La app **no hace ni reemplaza exámenes visuales**. Trabaja con la receta del oftalmólogo y lo que cuenta el paciente.

## Usarla

Es un solo archivo: `index.html`. No necesita servidor ni base de datos.

- **En una computadora:** abrí `index.html` con el navegador.
- **En internet:** publicá el repositorio con GitHub Pages (Settings → Pages → rama `main`).

Los datos del paciente quedan solo en esa pestaña y vencen a las 2 horas: cada vez que se abre el link arranca en blanco. La configuración local del modo óptica se guarda en el navegador.

## Configurar tu óptica

La configuración oficial es el archivo **`config/optica.json`**: es la que ven todos los pacientes. Para cambiarla para todos, editá ese archivo en GitHub (o pedíselo a quien te instaló la app).

Para probar cambios, entrá en **modo óptica**: tocá "Acceso óptica" al pie de la página y poné el PIN (de fábrica `1234`, cambialo apenas entres). En modo óptica aparece el botón **Configuración**, y lo que cambies queda guardado solo en esa compu. Los pacientes no ven el botón y siempre usan `config/optica.json`.

> El PIN evita que un paciente entre por curiosidad, pero no es una seguridad fuerte: la app no tiene servidor. Lo que de verdad protege tu configuración es que solo vos podés editar el repositorio.

Desde Configuración podés editar:

- **Qué ofrece tu óptica:** destildá las especialidades que no trabajás (lentes de contacto, control de miopía, seguridad, deportivos, antiparras) y no se recomiendan ni se pregunta por ellas.
- Nombre de la óptica, **número de WhatsApp** (el botón "Contactar a la óptica" le abre al paciente un mensaje con su nombre, edad, por dónde quiere empezar, el resto del plan y su receta), saludos y texto legal.
- **Tecnologías** (por función, sin marcas) con los nombres que usa tu óptica.
- **Momentos** del día (en el JSON) y a qué momento pertenece cada sugerencia.
- **Sugerencias:** nombre, prioridad y la condición que las hace aparecer.
- **JSON completo:** preguntas, productos, sugerencias, soluciones y motivos. Se puede copiar, descargar e importar para pasarlo a otra computadora.

Para pasar tus cambios al archivo oficial: en Configuración tocá **Copiar** en el JSON completo y pegalo en `config/optica.json`. El `pinHash` que aparece ahí es tu PIN cifrado: incluilo para que el PIN nuevo sirva en todas las compus.

### Condiciones

Las sugerencias, motivos y prioridades usan condiciones simples, sin código:

| Dato | Qué es |
|---|---|
| `add`, `potencia`, `esf_max`, `cil_max`, `edad`, `receta_meses` | números (`esf_max`/`cil_max`: el mayor valor absoluto entre los dos ojos) |
| `lejos`, `miopia`, `hipermetropia`, `astigmatismo`, `anisometropia`, `receta` | sí / no |
| `receta_tipo` | `"anteojos"`, `"lc"` o `"ambos"` |
| el código de cada pregunta | la respuesta (`maneja == "noche"`) o la lista de respuestas (`"pc" in trabajo`) |
| `derivados` | condiciones con nombre propio, definidas en el JSON (`oscurece`, `usa_pc`…) |

Operadores: `and`/`y`, `or`/`o`, `not`/`no`, `in`/`en`, `== != > >= < <=`, paréntesis y listas `["5-8","8+"]`.

Ejemplo: `add > 0 and (lejos or "lejos" in dist)`

### Estructura de una sugerencia

```json
{
  "id": "manejo",
  "momento": "manejo",
  "nombre": "Anteojos para manejar",
  "cuando": "maneja_si",
  "porque": "(opcional: reemplaza el texto general de por qué)",
  "puntos": [{ "n": 1 }, { "si": "maneja_mucho", "n": 3 }, { "si": "graduacion_baja", "n": -3 }],
  "motivos": [{ "si": "maneja_frec", "texto": "Nos dijiste que manejás {maneja_frec}." }],
  "soluciones": [
    { "id": "uno", "nombre": "Manejo",
      "pares": [
        { "nombre": "De día", "tecnologias": [{ "id": "polar" }] },
        { "nombre": "De noche", "si": "maneja_noche", "tecnologias": [{ "id": "ar" }, { "id": "contraste" }] }
      ] }
  ]
}
```

- `momento`: en qué grupo aparece (`dia`, `trabajo`, `manejo`, `sol`, `deporte`, `salidas`, `cerca`, `repuesto`, o los que definas).
- `prioridad: "ess"` la hace esencial ("Lo esencial: ver bien todo el día"). Las demás usan `puntos`: se suman los `n` cuyo `si` se cumple. Debajo de `puntosMinimos` va a "Ver más opciones"; desde `puntosRecomendado` es "Muy recomendado"; en el medio, "Opcional". Se muestran hasta `maxSugerencias`.
- El texto general de "¿Por qué es…?" está en `optica.porque` (`ess`, `rec`, `opt`); debajo van los `motivos` que se cumplen, con las respuestas (`{pregunta}` se reemplaza por lo que contestó).
- Si hay varias `soluciones` se muestran como alternativas A, B, C (por ejemplo multifocal, bifocal o dos anteojos).
- Cada par lista `tecnologias`; cada una puede tener `si` (por ejemplo `{"id":"blue","si":"filtro_azul"}`).
- Una pregunta puede tener `si` para aparecer solo cuando corresponde (`"si": "maneja_si"`).

## Probador y centrado (prototipo)

`probador/index.html` es una página aparte, pensada para la tienda online:

- **Probar armazón:** con la cámara frontal (en vivo) o una foto, dibuja el armazón sobre la cara a escala real según calibre, puente y alto de lente, y sigue la inclinación y el giro de la cabeza. También acepta la foto frontal de un armazón (PNG, se le puede quitar el fondo blanco) con su ancho total en mm.
- **Medir DNP y altura:** detecta las pupilas y el centro de la nariz en una foto de frente. La escala sale de una tarjeta (DNI, SUBE o de crédito, 85,6 mm) apoyada en la frente, del ancho de un armazón puesto o, como estimación, del tamaño promedio del iris. Corrige la convergencia de mirar a la cámara para dar la DP de lejos. Con el armazón puesto, mide la altura de montaje.

Usa MediaPipe Face Landmarker (de Google) dentro del navegador: las fotos no salen del dispositivo. La cámara solo funciona con https (GitHub Pages sirve). Margen esperado de 1 a 2 mm con tarjeta; para pedir lentes conviene confirmar en el mostrador.

## Lectura de recetas con IA

- Dentro de Claude (claude.ai) funciona sin configurar nada.
- Instalada en tu sitio: elegí el proveedor (Claude, Gemini o ChatGPT) y cargá su clave de API en Configuración. La opción más barata es Gemini Flash-Lite. Se guarda solo en ese navegador y nunca se exporta. Usala en computadoras de la óptica, no en equipos públicos.

## Licencia

Copyright (C) 2026 Gabriel Rodriguez.

Este programa es software libre bajo la **GNU Affero General Public License v3.0 o posterior** (ver `LICENSE`). Podés usarlo, modificarlo y compartirlo. Si lo modificás y lo ofrecés a otros como servicio en línea, tenés que publicar el código de tus cambios bajo la misma licencia.

Instalación, carga de catálogo y soporte para ópticas: contactar a Óptica Rodriguez.
