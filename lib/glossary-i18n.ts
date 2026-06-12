import type { Lang } from "./i18n";

/**
 * Descripciones de las figuras y sus traducciones (es / de / en). Toda la
 * explicación vive aquí; `glossary.ts` solo guarda metadatos estructurales
 * (startsAt / endsAt / implies). Los nombres de figuras NO se traducen: son
 * los cantos de la rueda (Dile que no, Enchufla, Guapeala, Básico…).
 */

export const FIGURE_NOTE_ES: Record<string, string> = {
  Básico:
    "No se canta: es el estado de descanso al que se llega después de muchas figuras. Posición cerrada, los dos de frente. Desde aquí salen las figuras de sabor; para pasar al lado de las vueltas se hace un Dile que no.",
  Guapeala:
    "No se canta: es el estado al que se llega desde un Dile que no. La persona que sigue queda a la izquierda y la persona líder a la derecha. Las dos hacen los primeros 3 pasos mirando hacia el círculo, luego se acercan en espejo: la persona líder extiende su mano derecha y la persona que sigue su mano izquierda, se tocan como empujándose y vuelven a la posición abierta mirando al círculo. De aquí salen enchuflas, lazos, sombreros y demás vueltas.",
  "Dile que no":
    "Desde Básico, la persona líder se mueve hacia delante y la persona que sigue va un poco hacia atrás para tomar impulso. La persona que sigue da un paso atrás y dos adelante formando un triángulo, y en ese triángulo pasa al otro lado con un giro de 180° para quedar en Guapeala. En la pausa del 4 se puede meter estilo (levantar la pierna, etc.) y al terminar en el 7 también cae otro momento de estilo (hombros, cadera). 1×8.",
  "Dile que sí":
    "Lo contrario del Dile que no: te devuelve de Guapeala a Básico. Desde Guapeala, la persona líder con la mano izquierda dirige a la persona que sigue de izquierda a derecha, quedando ambas de frente en posición de Básico. 1×8.",
  Exhibela:
    "Desde Básico, la persona líder levanta su mano izquierda y la persona que sigue, con su mano derecha conectada a esa mano, da una vuelta hacia la derecha moviendo el cuerpo hacia la derecha y regresa al Básico. 1×8.",
  Cocacola:
    "Arranca con un Dile que no y la pareja hace tres giros de 180°. Al pasar los primeros 180°, la persona que sigue gira hacia adentro mientras la persona líder está atrás girando o avanzando con ella. Cuando completan los tres giros y regresan a la posición inicial, cierran con otro Dile que no para terminar en Guapeala. Se puede cantar solo «cocacola» o «dile que no cocacola». 1×8.",
  Cocacolita:
    "Igual que la Cocacola pero más rápida y adornada: antes del giro de 180° se hace un giro hacia adentro de la persona que sigue. Lleva el Dile que no implícito al inicio. Se puede cantar solo «cocacolita» o «dile que no cocacolita». Termina en Guapeala. 1×8.",
  Contratiempo:
    "Paso básico en contratiempo (acentuando en el 2 y el 6 en vez del 1 y el 5). Es el estado desde donde arrancan Americano, Americana y Todos americanos. 1×8.",
  Sabrosura:
    "Figura de sabor y goce desde Contratiempo o Básico. Se juega con el ritmo, movimientos de cadera y brazos libres. Sale con Dile que no. 1×8.",
  Americano:
    "Desde Contratiempo, es una enchufla para la persona líder: rota su cuerpo hacia la izquierda y pasa a la siguiente persona que sigue. Termina en Básico con nueva pareja. 1×8.",
  Americana:
    "Desde Contratiempo, es una enchufla para la persona que sigue: va hacia la derecha y pasa al siguiente líder. Termina en Básico. 1×8.",
  "Todos americanos":
    "Desde Contratiempo, las dos personas hacen una enchufla: el líder rota hacia la izquierda, la persona que sigue va hacia la derecha y vuelven a Básico. Antes de llegar a la mitad se puede meter Corazón o Salúdate. 1×8.",
  Corazón:
    "Desde Todos americanos, la persona líder hace un gesto de corazón con las manos de la pareja mientras la saca. Vuelve a Todos americanos. 1×8.",
  Arriba:
    "Desde Básico, las personas líderes se mueven en la dirección del círculo hacia arriba (cerrándolo) y las personas que siguen van hacia atrás, manteniendo el paso básico. Ajusta el tamaño de la rueda. 1×8.",
  Abajo:
    "Lo contrario de Arriba: las personas líderes se mueven hacia abajo (abriendo el círculo) y las que siguen hacia atrás, manteniendo el básico. 1×8.",
  Tarro:
    "Cambio de pareja en posición cerrada. La persona líder alza su mano izquierda y la persona que sigue conecta su mano derecha a esa mano. Hace un triángulo: primeros 3 pasos hacia la izquierda y los siguientes 3 hacia la derecha, pasando así a la persona que sigue al siguiente líder. 1×8.",
  "Pa dentro y pa fuera":
    "Desde Básico, la persona líder hace un juego de pies cruzados: abre el cuerpo hacia la derecha los primeros 3 pasos y hacia la izquierda los últimos 3. La persona que sigue avanza 3 pasos en dirección del círculo, gira a la izquierda y hace otros 3. Entre ambas se crea un efecto de ola. Puro sabor de timba. 1×8.",
  "Camina la rueda":
    "Girar con la rueda dando guapeala mientras la rueda avanza. La mano del seguidor y la del líder se encuentran (como en el guapeala); después se abre el guapeala y se toca la mano libre con la persona de al lado, y así se va repitiendo mientras la rueda sigue girando en su dirección. Es la entrada desde la que luego se puede decir Saluda la rueda. Termina en Guapeala. 1×8.",
  "Saluda la rueda":
    "Se dice después de Camina la rueda, ya estando en Guapeala. Consiste en seguir caminando en la dirección de la rueda hacia la derecha, alternando con un aplauso: se aplaude a la persona de adelante, luego (otro aplauso) a la persona de atrás, e ir alternando adelante y atrás mientras la rueda sigue girando. Termina en Guapeala. 1×8.",
  Salúdate:
    "Estando en Guapeala, en el tiempo 1 se chocan las manos con la persona vecina (la de al lado, que no es la pareja actual) y se vuelve a Guapeala. Empieza y termina en Guapeala. 1×8.",
  "Salúdate y dame":
    "Estando en Guapeala, se hace el saludo como en el Salúdate (chocar las manos con la persona vecina en el 1) y enseguida se hace un Dame agarrados de las manos, pasando a la siguiente pareja. Termina en Guapeala. 1×8.",
  Enchufla:
    "Desde Guapeala, la persona líder mueve su mano izquierda un poco hacia afuera para tomar impulso y dirige a la persona que sigue hacia la derecha. Al levantar la mano izquierda, la persona que sigue gira hacia adentro (hacia la derecha, hacia el interior de la pareja) a los 180°, completa el giro de 360° y sigue su camino hacia la siguiente persona líder. La persona líder continúa hacia adelante a recibir a su nueva pareja. Al encontrarse, las dos personas hacen un Dile que no implícito. 2×8.",
  "Enchufla arriba":
    "Igual que la Enchufla hasta los 180°, pero en vez de seguir, la persona que sigue se queda ahí. La persona líder da una vuelta hacia adentro de la rueda para encontrarse con su nueva pareja. Al encontrarse, las dos personas hacen un Dile que no implícito y quedan más cerca del centro. 2×8.",
  "Enchufla doble":
    "Comienza como una Enchufla pero a los 90° (primeros 3 pasos) la persona que sigue se devuelve hacia atrás sin completar la vuelta. Luego la persona líder la jala de nuevo, gira hacia adentro de la pareja y continúa hacia la siguiente persona. Al encontrarse hacen un Dile que no implícito. 3×8.",
  Directo:
    "Desde Guapeala, con la mano izquierda (puede cambiarse de mano o no), las dos personas se jalan para darse impulso y se dirigen hacia la primera persona en esa dirección. Al llegar hacen un Dile que no implícito para quedar en Guapeala. 1×8.",
  "Directo pasando":
    "Igual que el Directo pero en vez de llegar a la primera persona, pasan de largo y llegan a la segunda. Cierran con Dile que no implícito. 1×8.",
  "Directo pareja":
    "Desde Guapeala, se dan impulso y le dan toda la vuelta a la rueda hasta regresar con su pareja original. Cierran con Dile que no implícito para quedar en Guapeala. 1×8.",
  Dame:
    "Desde Guapeala, la persona que sigue deja su mano izquierda para que la persona líder coloque su mano derecha en su omóplato. La persona que sigue pone su mano en el hombro del líder. En esta posición cerrada, la persona líder se acerca a la siguiente pareja y hacen un Dile que no. 1×8.",
  "Dame una arriba":
    "Lleva un Dile que no implícito, pero al ser «arriba» la persona líder se va hacia la izquierda y hace el Dile que no con la persona de la izquierda, cerrando la rueda (más cerca del centro). El mismo patrón de «arriba» aplica a Enchufla arriba y Mira la bonita arriba: se van una a la izquierda y luego Dile que no. 1×8.",
  "Dame dos":
    "Se deja la pareja actual. La persona que sigue pasa una persona por delante (por adentro del círculo), llegando a la segunda persona que sigue. La persona líder se acerca y hacen un Dile que no, encontrando el ritmo para terminarlo juntos. 1×8.",
  "Dame dos y una afuera":
    "Comienza con Dame dos: se pasa la primera persona, luego la persona líder sale del círculo mientras la persona que sigue va por adentro. Después la persona líder vuelve hacia la tercera persona y la persona que sigue regresa a la posición del círculo. Cierran con un Dile que no. 1×8.",
  Patineta:
    "Desde Patineta solo se puede seguir con Cambio, Se fue o Dame; ninguna otra figura sale de ahí. En Patineta el líder pasa al frente. 1×8.",
  Manolín:
    "Figura hermana de Patineta. Comparte la lógica de Cambio, Se fue y Dame. 1×8.",
  Cambio:
    "En Patineta o Manolín, el Cambio invierte quién va al frente. En el mapa vuelve a la familia Patineta/Manolín para poder seguir.",
  "Se fue":
    "Depende de quién va al frente. Con el líder al frente (Patineta): es como una enchufla para el hombre, después una mira la bonita con las manos unidas, se termina en sombrero y luego Dile que no. Con la persona que sigue al frente (tras el Cambio): es una enchufla para ella, después un final en sombrero y Dile que no. Termina en Guapeala.",
  "Mira la bonita arriba":
    "Variante «arriba» de la Mira la bonita. Lleva implícitos un cambio de pareja y un Dile que no. Termina en Básico.",
  Amistad:
    "Sale de Croqueta. Se hace un sombrero y luego un Dile que no, terminando en Guapeala.",
};

export const FIGURE_NOTE_DE: Record<string, string> = {
  Básico:
    "Wird nicht angesagt: der Ruhezustand, in den man nach vielen Figuren zurückkehrt. Geschlossene Position, beide einander zugewandt. Von hier starten die Sabor-Figuren; um zur Drehseite zu wechseln, macht man ein Dile que no.",
  Guapeala:
    "Wird nicht angesagt: der Zustand, den man über ein Dile que no erreicht. Die Folgende steht links, die Führende rechts. Beide machen die ersten 3 Schritte zum Kreis hin, dann nähern sie sich spiegelbildlich: die Führende streckt die rechte Hand, die Folgende die linke, sie berühren sich wie zum Abstoßen und kehren in die offene Position zum Kreis zurück. Von hier gehen Enchuflas, Lazos, Sombreros und andere Drehungen aus.",
  "Dile que no":
    "Aus dem Básico geht die Führende nach vorn und die Folgende etwas zurück, um Schwung zu holen. Die Folgende macht einen Schritt zurück und zwei nach vorn, bildet ein Dreieck und wechselt darin mit einer 180°-Drehung auf die andere Seite, um in Guapeala zu landen. In der Pause auf der 4 kann man Stil einbauen (Bein heben usw.) und am Ende auf der 7 fällt ein weiterer Stilmoment (Schultern, Hüfte). 1×8.",
  "Dile que sí":
    "Das Gegenteil vom Dile que no: bringt dich von Guapeala zurück nach Básico. Aus Guapeala führt die Führende mit der linken Hand die Folgende von links nach rechts, beide enden einander zugewandt in der Básico-Position. 1×8.",
  Exhibela:
    "Aus dem Básico hebt die Führende die linke Hand und die Folgende dreht sich mit ihrer rechten Hand an dieser Hand nach rechts, bewegt den Körper nach rechts und kehrt in den Básico zurück. 1×8.",
  Cocacola:
    "Beginnt mit einem Dile que no und das Paar macht drei 180°-Drehungen. Bei den ersten 180° dreht sich die Folgende nach innen, während die Führende dahinter mitdreht oder mitgeht. Nach den drei Drehungen und zurück in der Ausgangsposition schließt man mit einem weiteren Dile que no und endet in Guapeala. Man kann nur «cocacola» oder «dile que no cocacola» ansagen. 1×8.",
  Cocacolita:
    "Wie die Cocacola, aber schneller und verzierter: vor der 180°-Drehung macht die Folgende eine Drehung nach innen. Trägt am Anfang das Dile que no implizit. Man kann nur «cocacolita» oder «dile que no cocacolita» ansagen. Endet in Guapeala. 1×8.",
  Contratiempo:
    "Grundschritt im Contratiempo (Betonung auf der 2 und der 6 statt 1 und 5). Der Zustand, aus dem Americano, Americana und Todos americanos starten. 1×8.",
  Sabrosura:
    "Sabor- und Genuss-Figur aus Contratiempo oder Básico. Man spielt mit Rhythmus, Hüfte und freien Armen. Der Ausstieg ist Dile que no. 1×8.",
  Americano:
    "Aus dem Contratiempo eine Enchufla für die Führende: sie dreht den Körper nach links und wechselt zur nächsten Folgenden. Endet im Básico mit neuem Partner. 1×8.",
  Americana:
    "Aus dem Contratiempo eine Enchufla für die Folgende: sie geht nach rechts und wechselt zum nächsten Führenden. Endet im Básico. 1×8.",
  "Todos americanos":
    "Aus dem Contratiempo machen beide eine Enchufla: die Führende dreht nach links, die Folgende geht nach rechts und zurück zum Básico. Vor der Mitte kann man Corazón oder Salúdate einbauen. 1×8.",
  Corazón:
    "Aus Todos americanos formt die Führende mit den Händen des Paares ein Herz. Kehrt zu Todos americanos zurück. 1×8.",
  Arriba:
    "Aus dem Básico bewegen sich die Führenden in Kreisrichtung nach oben (Kreis schließen) und die Folgenden nach hinten, im Grundschritt. Passt die Größe der Rueda an. 1×8.",
  Abajo:
    "Das Gegenteil von Arriba: die Führenden gehen nach unten (Kreis öffnen) und die Folgenden nach hinten, im Básico. 1×8.",
  Tarro:
    "Partnerwechsel in geschlossener Position. Die Führende hebt die linke Hand und die Folgende verbindet ihre rechte Hand damit. Es entsteht ein Dreieck: erste 3 Schritte nach links, nächste 3 nach rechts, so wechselt die Folgende zum nächsten Führenden. 1×8.",
  "Pa dentro y pa fuera":
    "Aus dem Básico macht die Führende ein gekreuztes Fußspiel: öffnet den Körper die ersten 3 Schritte nach rechts und die letzten 3 nach links. Die Folgende geht 3 Schritte in Kreisrichtung, dreht nach links und macht weitere 3. Zwischen beiden entsteht ein Welleneffekt. Reiner Timba-Sabor. 1×8.",
  "Camina la rueda":
    "Mit der Rueda drehen und dabei Guapeala geben, während die Rueda voranschreitet. Die Hand der Folgenden und die des Führenden treffen sich (wie im Guapeala); dann öffnet sich das Guapeala und man berührt mit der freien Hand die Person daneben, und so wiederholt es sich, während sich die Rueda weiter in ihre Richtung dreht. Es ist der Einstieg, von dem aus man danach Saluda la rueda ansagen kann. Endet in Guapeala. 1×8.",
  "Saluda la rueda":
    "Wird nach Camina la rueda angesagt, wenn man schon in Guapeala ist. Man geht in Rueda-Richtung weiter nach rechts und wechselt dabei mit einem Klatschen: man klatscht der Person vorn zu, dann (weiteres Klatschen) der Person hinten, und wechselt so zwischen vorn und hinten, während sich die Rueda weiterdreht. Endet in Guapeala. 1×8.",
  Salúdate:
    "In Guapeala: auf der Zählzeit 1 klatscht man in die Hände der Nachbarperson (die daneben, nicht der aktuelle Partner) und kehrt nach Guapeala zurück. Beginnt und endet in Guapeala. 1×8.",
  "Salúdate y dame":
    "In Guapeala: man grüßt wie beim Salúdate (auf der 1 in die Hände der Nachbarperson klatschen) und macht gleich ein Dame mit verbundenen Händen, zum nächsten Partner wechselnd. Endet in Guapeala. 1×8.",
  Enchufla:
    "Aus Guapeala bewegt die Führende die linke Hand etwas nach außen, um Schwung zu holen, und führt die Folgende nach rechts. Beim Heben der linken Hand dreht die Folgende bei 180° nach innen (nach rechts, ins Innere des Paares), vollendet die 360°-Drehung und geht weiter zum nächsten Führenden. Die Führende geht nach vorn, um den neuen Partner zu empfangen. Beim Treffen machen beide ein implizites Dile que no. 2×8.",
  "Enchufla arriba":
    "Wie die Enchufla bis 180°, aber statt weiterzugehen bleibt die Folgende dort. Die Führende dreht ins Innere der Rueda, um den neuen Partner zu treffen. Beim Treffen machen beide ein implizites Dile que no und enden näher an der Mitte. 2×8.",
  "Enchufla doble":
    "Beginnt wie eine Enchufla, aber bei 90° (erste 3 Schritte) geht die Folgende zurück, ohne die Drehung zu vollenden. Dann zieht die Führende sie erneut, dreht ins Innere des Paares und geht weiter zur nächsten Person. Beim Treffen ein implizites Dile que no. 3×8.",
  Directo:
    "Aus Guapeala ziehen sich beide mit der linken Hand (kann gewechselt werden) für Schwung und gehen zur ersten Person in dieser Richtung. Beim Ankommen ein implizites Dile que no, um in Guapeala zu bleiben. 1×8.",
  "Directo pasando":
    "Wie der Directo, aber statt zur ersten geht man an ihr vorbei zur zweiten Person. Schließt mit implizitem Dile que no. 1×8.",
  "Directo pareja":
    "Aus Guapeala holt man Schwung und geht einmal um die ganze Rueda, bis man zum ursprünglichen Partner zurückkehrt. Schließt mit implizitem Dile que no, um in Guapeala zu bleiben. 1×8.",
  Dame:
    "Aus Guapeala löst die Folgende ihre linke Hand, damit die Führende ihre rechte Hand auf deren Schulterblatt legt. Die Folgende legt ihre Hand auf die Schulter der Führenden. In dieser geschlossenen Position nähert sich die Führende dem nächsten Paar und sie machen ein Dile que no. 1×8.",
  "Dame una arriba":
    "Trägt ein implizites Dile que no, aber da es «arriba» ist, geht die Führende nach links und macht das Dile que no mit der Person links, wodurch die Rueda geschlossen wird (näher an der Mitte). Dasselbe «arriba»-Muster gilt für Enchufla arriba und Mira la bonita arriba: man geht nach links und dann Dile que no. 1×8.",
  "Dame dos":
    "Der aktuelle Partner wird gelassen. Die Folgende geht an einer Person vorbei (innen im Kreis) bis zur zweiten Folgenden. Die Führende nähert sich und sie machen ein Dile que no, im Rhythmus gemeinsam beendet. 1×8.",
  "Dame dos y una afuera":
    "Beginnt mit Dame dos: man geht an der ersten Person vorbei, dann verlässt die Führende den Kreis, während die Folgende innen geht. Danach kehrt die Führende zur dritten Person zurück und die Folgende zur Kreisposition. Schließt mit einem Dile que no. 1×8.",
  Patineta:
    "Aus Patineta kann man nur mit Cambio, Se fue oder Dame weitermachen; keine andere Figur geht von dort aus. In Patineta geht die Führende nach vorn. 1×8.",
  Manolín:
    "Schwesterfigur von Patineta. Teilt die Logik von Cambio, Se fue und Dame. 1×8.",
  Cambio:
    "In Patineta oder Manolín kehrt Cambio um, wer vorne ist. Im Graphen führt es zurück zur Patineta/Manolín-Familie, damit die Sequenz weitergehen kann.",
  "Se fue":
    "Hängt davon ab, wer vorn ist. Mit der Führenden vorn (Patineta): wie eine Enchufla für den Mann, dann eine Mira la bonita mit verbundenen Händen, Abschluss im Sombrero und dann ein Dile que no. Mit der Folgenden vorn (nach dem Cambio): eine Enchufla für sie, dann ein Sombrero-Abschluss und Dile que no. Endet in Guapeala.",
  "Mira la bonita arriba":
    "«Arriba»-Variante der Mira la bonita. Beinhaltet implizit einen Partnerwechsel und ein Dile que no. Endet in Básico.",
  Amistad:
    "Kommt aus der Croqueta. Man macht einen Sombrero und dann ein Dile que no und endet in Guapeala.",
};

export const FIGURE_NOTE_EN: Record<string, string> = {
  Básico:
    "Not called: the resting state you return to after many figures. Closed position, both facing each other. The sabor figures start here; to move to the turning side you do a Dile que no.",
  Guapeala:
    "Not called: the state reached from a Dile que no. The follower ends on the left and the leader on the right. Both take the first 3 steps facing the circle, then approach in mirror: the leader extends the right hand, the follower the left, they touch as if pushing off and return to the open position facing the circle. Enchuflas, lazos, sombreros and other turns start here.",
  "Dile que no":
    "From Básico, the leader moves forward and the follower goes slightly back to gather momentum. The follower steps back and twice forward forming a triangle, and within it crosses to the other side with a 180° turn to land in Guapeala. On the pause of 4 you can add style (lift the leg, etc.) and ending on 7 there's another style moment (shoulders, hips). 1×8.",
  "Dile que sí":
    "The opposite of Dile que no: it brings you from Guapeala back to Básico. From Guapeala the leader uses the left hand to lead the follower from left to right, both ending facing each other in the Básico position. 1×8.",
  Exhibela:
    "From Básico, the leader raises the left hand and the follower, with the right hand connected to it, turns to the right moving the body rightward and returns to Básico. 1×8.",
  Cocacola:
    "Starts with a Dile que no and the couple does three 180° turns. On the first 180° the follower turns inward while the leader turns or advances behind. After the three turns and back to the start, they close with another Dile que no to end in Guapeala. You can call just «cocacola» or «dile que no cocacola». 1×8.",
  Cocacolita:
    "Like the Cocacola but faster and more ornamented: before the 180° turn the follower does an inward turn. Carries the Dile que no implicit at the start. You can call just «cocacolita» or «dile que no cocacolita». Ends in Guapeala. 1×8.",
  Contratiempo:
    "Basic step on the offbeat (accenting on 2 and 6 instead of 1 and 5). The state from which Americano, Americana and Todos americanos start. 1×8.",
  Sabrosura:
    "Sabor and enjoyment figure from Contratiempo or Básico. You play with rhythm, hips and free arms. It exits with Dile que no. 1×8.",
  Americano:
    "From Contratiempo, an enchufla for the leader: rotates the body to the left and moves to the next follower. Ends in Básico with a new partner. 1×8.",
  Americana:
    "From Contratiempo, an enchufla for the follower: goes right and moves to the next leader. Ends in Básico. 1×8.",
  "Todos americanos":
    "From Contratiempo, both do an enchufla: the leader rotates left, the follower goes right and they return to Básico. Before reaching the middle you can add Corazón or Salúdate. 1×8.",
  Corazón:
    "From Todos americanos, the leader makes a heart shape with the couple's hands. Returns to Todos americanos. 1×8.",
  Arriba:
    "From Básico, the leaders move in the circle direction upward (closing it) and the followers go back, keeping the basic step. Adjusts the size of the rueda. 1×8.",
  Abajo:
    "The opposite of Arriba: the leaders move down (opening the circle) and the followers back, in the básico. 1×8.",
  Tarro:
    "Partner change in closed position. The leader raises the left hand and the follower connects the right hand to it. A triangle forms: first 3 steps to the left and the next 3 to the right, passing the follower to the next leader. 1×8.",
  "Pa dentro y pa fuera":
    "From Básico, the leader does a crossed footwork: opens the body to the right the first 3 steps and to the left the last 3. The follower advances 3 steps in the circle direction, turns left and does another 3. Between them a wave effect forms. Pure timba sabor. 1×8.",
  "Camina la rueda":
    "Turn with the rueda giving guapeala while the rueda moves along. The follower's hand and the leader's hand meet (as in the guapeala); then the guapeala opens and you touch the free hand with the person beside you, and it keeps repeating while the rueda turns in its direction. It's the entry from which you can then call Saluda la rueda. Ends in Guapeala. 1×8.",
  "Saluda la rueda":
    "Called after Camina la rueda, once you're already in Guapeala. You keep walking in the rueda direction to the right, alternating with a clap: you clap to the person in front, then (another clap) to the person behind, alternating front and back while the rueda keeps turning. Ends in Guapeala. 1×8.",
  Salúdate:
    "In Guapeala: on count 1 you clap hands with the neighboring person (the one beside you, not your current partner) and return to Guapeala. Starts and ends in Guapeala. 1×8.",
  "Salúdate y dame":
    "In Guapeala: you greet as in Salúdate (clap hands with the neighbor on the 1) and immediately do a Dame holding hands, moving to the next partner. Ends in Guapeala. 1×8.",
  Enchufla:
    "From Guapeala, the leader moves the left hand slightly outward to gather momentum and leads the follower to the right. As the left hand rises, the follower turns inward at 180° (to the right, into the couple), completes the 360° turn and continues toward the next leader. The leader moves forward to receive the new partner. On meeting, both do an implicit Dile que no. 2×8.",
  "Enchufla arriba":
    "Like the Enchufla up to 180°, but instead of continuing the follower stays there. The leader turns into the inside of the rueda to meet the new partner. On meeting, both do an implicit Dile que no and end closer to the center. 2×8.",
  "Enchufla doble":
    "Starts like an Enchufla but at 90° (first 3 steps) the follower goes back without completing the turn. Then the leader pulls her again, turns into the couple and continues to the next person. On meeting, an implicit Dile que no. 3×8.",
  Directo:
    "From Guapeala, with the left hand (can be switched or not), both pull for momentum and head to the first person in that direction. On arriving, an implicit Dile que no to stay in Guapeala. 1×8.",
  "Directo pasando":
    "Like the Directo but instead of reaching the first person, they pass by to the second. Close with an implicit Dile que no. 1×8.",
  "Directo pareja":
    "From Guapeala, you gather momentum and go all the way around the rueda until returning to your original partner. Close with an implicit Dile que no to stay in Guapeala. 1×8.",
  Dame:
    "From Guapeala, the follower releases the left hand so the leader places the right hand on her shoulder blade. The follower puts a hand on the leader's shoulder. In this closed position the leader approaches the next couple and they do a Dile que no. 1×8.",
  "Dame una arriba":
    "Carries an implicit Dile que no, but since it's «arriba» the leader goes to the left and does the Dile que no with the person on the left, closing the rueda (closer to the center). The same «arriba» pattern applies to Enchufla arriba and Mira la bonita arriba: you go one to the left and then Dile que no. 1×8.",
  "Dame dos":
    "The current partner is left. The follower passes one person in front (inside the circle), reaching the second follower. The leader approaches and they do a Dile que no, finding the rhythm to finish it together. 1×8.",
  "Dame dos y una afuera":
    "Starts with Dame dos: you pass the first person, then the leader exits the circle while the follower goes inside. Then the leader returns toward the third person and the follower back to the circle position. Close with a Dile que no. 1×8.",
  Patineta:
    "From Patineta you can only continue with Cambio, Se fue or Dame; no other figure leaves from there. In Patineta the leader moves to the front. 1×8.",
  Manolín:
    "Sister figure to Patineta. It shares the Cambio, Se fue and Dame logic. 1×8.",
  Cambio:
    "In Patineta or Manolín, Cambio reverses who is in front. In the graph it returns to the Patineta/Manolín family so the sequence can continue.",
  "Se fue":
    "Depends on who's in front. With the leader in front (Patineta): like an enchufla for the man, then a Mira la bonita with joined hands, finishing in sombrero and then a Dile que no. With the follower in front (after the Cambio): an enchufla for her, then a sombrero ending and Dile que no. Ends in Guapeala.",
  "Mira la bonita arriba":
    "«Arriba» variant of Mira la bonita. It implicitly carries a partner change and a Dile que no. Ends in Básico.",
  Amistad:
    "Comes from Croqueta. You do a sombrero and then a Dile que no, ending in Guapeala.",
};

/** Nota de la figura en el idioma pedido, con fallback al español. */
export function localizedNote(
  figure: string,
  lang: Lang,
): string | undefined {
  if (lang === "de") return FIGURE_NOTE_DE[figure] ?? FIGURE_NOTE_ES[figure];
  if (lang === "en") return FIGURE_NOTE_EN[figure] ?? FIGURE_NOTE_ES[figure];
  return FIGURE_NOTE_ES[figure];
}
