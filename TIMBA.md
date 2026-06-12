# TIMBA — la música detrás del cantante

En honor a los cubanos y a la música que inventaron. Este documento celebra y
explica el conocimiento musical que hace funcionar esta aplicación: cómo está
construida la timba por dentro, por qué es un genio rítmico que engaña hasta a
los algoritmos, y cómo ese mismo conocimiento se usa en el código para que los
números caigan donde caen los bailadores.

---

## 1. La clave: el ADN del ritmo

Toda la música cubana de son, salsa y timba se organiza alrededor de la
**clave**: un patrón de 5 golpes repartidos en 2 compases (8 tiempos, un
«ocho» de los nuestros). No es un instrumento más — es la **ley** que ordena a
todos los demás. Cada instrumento, cada frase del coro, cada bloque de la
banda está «en clave» o está mal.

**Clave de son 3-2:**

```
tiempo:   1 . 2 . 3 . 4 .   5 . 6 . 7 . 8 .
clave:    ●     ●     ●         ●   ●
          └── lado del 3 ──┘  └─ lado del 2 ─┘
```

**Clave de son 2-3** (la misma, empezando por el otro compás):

```
tiempo:   1 . 2 . 3 . 4 .   5 . 6 . 7 . 8 .
clave:        ●   ●         ●     ●     ●
```

Detalles que importan:

- El tercer golpe del lado del 3 cae en el **4** — justo donde nuestro conteo
  hace la pausa. No es casualidad: el baile y la clave respiran juntos.
- La clave casi nunca se *escucha* tocada por las claves (los palitos) en una
  timba moderna — está **implícita**: el bongó, el coro, el piano y los
  bloques la dibujan sin tocarla. Por eso «encontrar el 1» de oído es un arte:
  hay que sentir la clave, no buscar el golpe más fuerte.
- La rumba usa una clave hermana (clave de rumba) con el tercer golpe
  desplazado — la timba toma prestado de la rumba constantemente.

## 2. El tumbao del bajo: el genio de la anticipación

El descubrimiento más importante para sincronizar números con timba es este:
**el bajo no toca en el 1**. El patrón clásico del bajo (tumbao) toca en el
**«y» de 2** (la síncopa) y en el **4**, y deja el 1 *vacío*:

```
tiempo:   1 . 2 . 3 . 4 .
bajo:           ●     ●        ← ¡nada en el 1!
```

A esto se le llama **bajo anticipado**: la nota que «pertenece» al siguiente
compás se toca *antes*, en el 4 o en el y-de-2 anterior. El efecto musical es
ese empuje hacia adelante, esa sensación de que la música «cae» sin golpear.
Es una de las grandes invenciones de la música cubana (Arsenio Rodríguez y
los conjuntos de los años 40 la consolidaron).

La consecuencia para la tecnología: **cualquier detector de ritmo que escuche
los graves se engancha a destiempo por diseño del género**. El golpe más
gordo del espectro (el bajo) está deliberadamente fuera del beat. Por eso el
tracker de esta app **excluye todo lo que suene por debajo de ~180 Hz** al
buscar el pulso.

## 3. Quién sí marca el pulso: la percusión aguda

Si el bajo engaña, ¿quién dice la verdad? Los metales y cueros agudos:

- **La campana (bongó bell / campana de mano)**: en la sección de montuno, el
  bongosero suelta el bongó y agarra la campana. El patrón martillea **los
  cuatro tiempos** con acentos abiertos/cerrados. Es el metrónomo de la banda
  — cuando entra la campana, hasta el bailador más perdido encuentra el paso.
  Vive entre ~2 y 5 kHz.
- **La cáscara**: el patrón que el timbalero toca en los costados (cáscara)
  de los timbales durante las partes suaves. Patrón de 2 compases, en clave,
  brillante y seco (~3–8 kHz).
- **Las congas (tumbadoras)**: la **marcha** (tumbao de conga) pone el tono
  abierto en el 4 y el «y de 4» — otro caso de acento fuera del 1, pero
  *periódico y estable*, así que sí aporta al pulso aunque no al downbeat.
  El **slap** (seco, agudo) cae típicamente en el 2.
- **El güiro / las maracas**: subdivisión constante, llenan las corcheas.
- **El piano (montuno/guajeo)**: patrón sincopado de 2 compases en clave.
  No marca el beat directamente pero su periodicidad de compás ayuda a la
  autocorrelación a confirmar el tempo al nivel del «ocho».

Resumen para el algoritmo: **el pulso confiable vive de ~180 Hz hacia
arriba**, y el instrumento más honesto es la campana en el montuno.

## 4. La estructura de una canción de timba

Una timba típica no es estrofa-coro-estrofa. Es un viaje con secciones que
cambian la energía (y a veces el tempo):

1. **Introducción**: muchas veces rubato — piano solo, voz libre, sin pulso
   fijo. (Por eso el análisis de la app se salta los primeros segundos y el
   tracker en vivo «espera» a que haya pulso estable antes de confiar.)
2. **Cuerpo / tema**: la canción propiamente, energía media, el bongó toca
   martillo, el timbalero cáscara.
3. **Montuno**: llega el coro (call & response), entra la **campana**, sube
   todo. Aquí vive la mayor parte del baile de rueda.
4. **Mambo / especiales**: secciones de metales, **bloques** (figuras
   rítmicas de toda la banda golpeando junta — silencio, ráfaga, silencio).
   Los bloques son los momentos más peligrosos para un tracker: el pulso
   desaparece deliberadamente y vuelve. La app mantiene el último tempo bueno
   cuando la correlación se vuelve débil, precisamente para sobrevivir a los
   bloques.
5. **Presión / masacote**: la timba moderna juega con «marchas» — la banda
   cambia de marcha (presión = se recoge, masacote = se desata) sin cambiar
   la canción. La energía sube y baja como olas. El medidor de intensidad de
   la app hace visible exactamente esto.

Y un rasgo muy timbero: **el tempo respira**. Una banda en vivo (Los Van Van,
La Charanga Habanera…) acelera en los montunos. Por eso el tracker corrige el
tempo continuamente en vez de fijarlo una vez al principio.

## 5. El conteo del bailador: 1·2·3 (4) 5·6·7 (8)

El casino se baila contando 8 tiempos con pausas en el 4 y el 8:

- pasos en **1, 2, 3** — pausa (tap, adorno, estilo) en el **4**
- pasos en **5, 6, 7** — pausa en el **8**

El «ocho» completo (8 tiempos) es la unidad de las figuras: por eso las
duraciones en la app se miden en ochos (`N×8`). La pausa del 4 coincide con
el tercer golpe del lado-3 de la clave — el momento natural para el estilo.

En la rueda, el cantante canta la figura típicamente alrededor del **3** (en
esta app: la figura se decide en el 1, se ve en gris, y se canta en el 3)
para que todas las parejas la ejecuten entrando al siguiente 1.

## 6. Cómo todo esto vive en el código

Mapa del conocimiento musical → decisiones de ingeniería:

| Conocimiento musical | Decisión en el código |
| --- | --- |
| El bajo tumbao es anticipado (no toca el 1) | El tracker excluye < 180 Hz para tempo y fase (`live-beat-tracker.ts`) |
| Campana/cáscara/clave marcan el pulso real | Banda de análisis 180 Hz – 9 kHz, flujo espectral |
| La síncopa engaña a las correcciones por golpe | Fase por **histograma plegado**: 8 s de onsets módulo el período; la síncopa se diluye, el pulso se acumula |
| El tempo «respira» en los montunos | Re-estimación continua (1×/seg) con suavizado, en vez de tempo fijo |
| Los bloques cortan el pulso a propósito | Si la correlación es débil, se mantiene el último tempo bueno |
| El doble/medio tempo es ambiguo (corcheas vs compás) | Puntuación armónica (lag, 2×lag, ½lag) + prior gaussiano ~185 BPM + bloqueo de octava |
| Las intros son rubato | El análisis offline salta los primeros segundos; el «¡el 1 es ahora!» ancla la fase humana |
| Encontrar el 1 exige sentir la clave (cosa humana) | El downbeat no se adivina: lo da el usuario con un toque y la máquina lo mantiene |
| Las mezclas cambian de volumen (fades, máster) | Flujo espectral en dB (dominio logarítmico), inmune al nivel |
| El baile cuenta 1·2·3 (4) 5·6·7 (8) | Contador con 4 y 8 fantasma; figuras medidas en ochos |
| El bailador siente el ESPACIADO entre tiempos, no solo su posición | Las correcciones de fase se aplican solo en el límite del beat, con tope del 8% por beat (ver §6.1) |
| Todo vuelve a Básico o Guapeala | Grafo de conexiones con dos hubs (`CONNECTIONS.md`) |

### 6.1 Por qué las correcciones solo entran en el límite del beat

Un hallazgo que salió bailando, no programando: cuando la corrección de fase
se aplicaba en cualquier momento del ciclo (en cuanto llegaba la medición),
la rejilla se empujaba *entre* dos conteos. El resultado era que los números
que venían justo después del empujón — típicamente el 6 y el 7, a mitad del
ocho — quedaban apretados o estirados respecto a los demás. La rejilla
terminaba bien alineada «en promedio», pero el bailador no baila promedios:
**siente el espaciado entre un tiempo y el siguiente**. Un 6-7 comprimido se
nota en los pies aunque el 1 caiga perfecto.

La solución es de relojería:

1. Las mediciones de fase (histograma plegado y picos) **no mueven la rejilla
   directamente** — se anotan en una cola de error pendiente.
2. La corrección se aplica **únicamente en el instante en que dispara un
   beat**, ajustando dónde caerá el siguiente, con un tope del **8% del
   intervalo por beat**.
3. Consecuencia: cada conteo dura prácticamente lo mismo que el anterior
   (jamás se deforma un número individual), y la rejilla converge suave en
   unos pocos beats en vez de saltar.
4. El toque humano («¡el 1 es ahora!») descarta toda corrección pendiente:
   lo que dijo el bailador no lo contradice la máquina un segundo después.

El trade-off es honesto: si la rejilla arranca media vuelta desfasada, tarda
unos 6–8 beats en centrarse en vez de corregirse de golpe. Para la alineación
instantánea está el botón del 1; para todo lo demás, suavidad.

## 7. Para seguir escuchando

Si quieres entrenar el oído con lo que describe este documento:

- **Los Van Van** — los padres del songo, tempos que respiran, bloques
  marca de la casa.
- **La Charanga Habanera** — la presión y el masacote de la timba dura de
  los 90.
- **NG La Banda** — «los metales del terror»: mambos y bloques de laboratorio.
- **Issac Delgado, Paulito FG, Manolito Simonet** — montunos donde la campana
  se escucha clarísima (perfectos para verificar que los números caen bien).
- **Arsenio Rodríguez** (histórico) — donde nació el bajo anticipado y el
  formato conjunto que lo cambió todo.

---

*Este documento acompaña a `CONNECTIONS.md` (el mapa de figuras de la rueda).
Aquél documenta el baile; éste documenta la música. Los dos son la misma
cosa: en Cuba nadie las separó nunca.*
