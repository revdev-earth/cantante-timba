# Mapa default de conexiones

Fuente humana para editar el grafo default. El codigo en `lib/connections.ts`
(`DEFAULT_EDGES` y `DEFAULT_POSITIONS`) debe reflejar este mapa.

Una arista `A → B` significa: despues de A, B es una figura natural para llamar.
El modo "conexiones" camina este grafo.

## Alias canonicos (solo display)

- `70` = setenta
- `70 por abajo` = setenta por abajo
- `70 complicada` = setenta complicada
- `80` = ochenta
- `90` = noventa
- `Ocho` = 8
- `Festival de flies` cubre festival de fly/flies
- `Dame dos y una afuera` cubre dame dos con una afuera

## Idea central: dos hubs

En la rueda **todo vuelve a `Básico` o a `Guapeala`**. Son los dos puntos de
descanso desde donde se arman los combos.

- **Básico** = base, sabor, figuras de a poco. Para *salir* de Básico hacia el
  lado de las vueltas se hace un **Dile que no**.
- **Dile que no** te deja en **Guapeala**.
- **Guapeala** = lucimiento, vueltas (enchuflas, lazos, sombreros, setentas,
  mira la bonita…). Desde aquí salen los combos "grandes".

Un combo es un pedacito que arranca en uno de los hubs, juega 2-3 figuras y
vuelve a un hub.

## Glosario

Fuente de datos: `lib/glossary.ts` (`FIGURE_DOC`). Cada figura puede tener:

- **termina en** (`endsAt`): el hub donde quedas parado al acabarla. Determina
  qué sale después. El modo "conexiones" usa esto: tras una figura, las
  siguientes salen del hub donde termina.
- **lleva implícito** (`implies`): figura que va incluida y no se canta
  (ej. Enchufla lleva el Dile que no implícito).
- **nota**: explicación para aprender.

En la app: clic en una burbuja abre su ficha (inicio / termina en / implícito /
nota). En modo **editar** la nota es un textarea editable; se guarda en
localStorage (`timba-figure-notes`). Así cualquiera la lee y aprende.

Documentado hasta ahora:

- **Tarro**: el que guía cambia de pareja en la rueda. Se entra desde `Arriba`;
  despues se sigue con la anterior (`Arriba`) y de ahi se cambia a `Abajo`.
- **Enchufla** → termina en Guapeala · lleva implícito Dile que no. Pasa la
  pareja a la siguiente persona; no hay que cantar el Dile que no. (No encadena
  con "Enchufla doble" — son entradas distintas.)
- **Dile que no** → termina en Guapeala. Cierra la salida de Básico.
- **Mira la bonita** → termina en Básico.
- **Cocacola** → termina en Guapeala.
- **Cocacolita** → termina en Guapeala.
- **Croqueta** → termina en Guapeala.
- **Exhibela**: lucimiento de la dama desde Básico; se cierra con un Dile que no.
- (resto: TODO — se va llenando desde la app)

## Conexiones

### Básico

Va a:

- Cocacola
- Cocacolita
- Dile que no
- Exhibela
- Arriba
- Abajo
- Pa dentro pa fuera
- Sabrosura
- Saloneo
- Camina la rueda
- Salúdate
- Salúdate y dame
- Contratiempo
- Americano
- Todos americanos

### Arriba / Tarro / Abajo

- `Arriba` → `Tarro`
- `Tarro` → `Arriba`
- `Tarro` → `Abajo`

### Dile que sí

Llega a `Básico`.

### Dame

Llega a `Básico`.

### Camina la rueda

Va a:

- Saluda la rueda
- Ni pa ti ni pa mi

### Saluda la rueda

Va a:

- Fly
- Fly doble

### Todos americanos

Va a:

- Salúdate
- Corazón
- Dile que no

### Guapeala

Va a:

- Directo
- Directo pasando
- Enchufla
- Enchufla arriba
- Enchufla doble
- Mira la bonita
- Mira la bonita arriba
- Mira la bonita sola
- 70
- 80
- 90
- 70 complicada
- 70 por abajo
- Sombrero
- Sombrero doble
- Sombrero por abajo
- Sombrero por atrás
- Sombrero complicado
- Tijera simple
- Fly
- Fly doble
- Festival de flies
- Directo pareja
- Cero
- Cero la vecina
- Ocho
- Dame
- Dame dos
- Dame dos y una afuera
- Dame una arriba
- Patineta
- Dile que sí

### Dile que no

Va a:

- Guapeala
- Paséala
- Dame
- Dame dos y una afuera
- Dame dos
- Dame una arriba

### Croqueta

Va a:

- Dile que no
- Exhibela
- Trompo
- Trompo por abajo
- Dos giros
- Amistad

### Enchufla

Va a:

- Lazo

### Lazo

Va a:

- Mujeres dos arriba
- Lazo mujeres dos arriba

### Saloneo

Va a:

- Tarita
- Fantasma
- Fantasma al centro
- Fantasmita

### Cero

Va a:

- Cero la vecina

### Contratiempo

Va a:

- Americana
- Americano
- Sabrosura

### Foto

Pausa visual. No tiene conexiones default.

## Combos

Pequeñas combinaciones (2-3 figuras, una por call). Se cantan en orden y cada
figura respeta su duracion en ochos.

Defaults en `lib/combos.ts` (`DEFAULT_COMBOS`). En la página **/combos** se
arman/ajustan: eliges el hub de inicio (Básico o Guapeala), y el constructor
sugiere solo las figuras conectadas desde donde estás parado (guiado por el
grafo + termina-en). Muestra tiempos (ochos) y dónde termina. Los combos del
usuario se guardan en localStorage (`timba-user-combos`) y entran al modo
aleatorio.

### Desde Guapeala (se llega con un Dile que no)

- Enchufla → Dame
- Enchufla → Lazo
- Enchufla → Lazo mujeres dos arriba
- Dile que no → Mira la bonita
- Dile que no → Mira la bonita sola
- Dame → Dame dos → Dame dos y una afuera
- 70 → 80 → 90
- Sombrero → Sombrero doble
- Sombrero → Sombrero complicado
- Cero → Cero la vecina
- Directo → Directo pasando
- Saluda la rueda → Fly → Fly doble
- Fly doble → Festival de flies

### Desde Básico (se sale con un Dile que no)

- Arriba → Tarro → Abajo
- Exhibela → Dile que no
- Dile que no → Dame
- Dile que no → Paséala
- Cocacola → Cocacolita
- Contratiempo → Sabrosura
- Todos americanos → Corazón

### Croqueta

- Croqueta → Exhibela
- Croqueta → Trompo → Trompo por abajo
- Croqueta → Dos giros → Amistad

## Tiempos (ochos)

Cada figura dura `N` ochos (8 tiempos). El cantante espera esos ochos antes
de la proxima llamada. Editable en la app (badge `N×8` en cada burbuja,
clic izq +1 / clic der -1, rango 1-8) y se guarda en localStorage
(`timba-durations`). Defaults en `lib/repertoire.ts` (`FIGURE_DURATION`):

| Figura | Ochos |
| --- | --- |
| Enchufla doble | 2 |
| 70 | 3 |
| 70 por abajo | 3 |
| 70 complicada | 3 |
| 80 | 3 |
| 90 | 3 |
| Sombrero doble | 2 |
| Sombrero complicado | 2 |
| (todas las demas) | 1 |

`Directo pareja` queda en 1 por default pero escala con el tamaño de la rueda;
se ajusta a mano la noche que haga falta.

El control global "tiempo ×" (1/2/4) multiplica todas las duraciones a la vez
para practicar mas lento.
