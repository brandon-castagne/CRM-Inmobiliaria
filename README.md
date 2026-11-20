# Mi CRM de Clientes

CRM personal para asesor inmobiliario: clientes, seguimientos, visitas y estadísticas.
Las propiedades se registran solo por su código de la inmobiliaria (`DOM-000001`); fotos, fichas y PDF quedan en el sistema de la empresa.

## Qué incluye

- **Hoy:** seguimientos atrasados, los del día, visitas de la semana y clientes nuevos sin contactar.
- **Clientes:** buscador (nombre, celular, código DOM, zona, etiqueta) y filtros por etapa, prioridad y origen.
- **Ficha del cliente:** celulares con botones de WhatsApp y Llamar, origen, prioridad (caliente/tibia/fría), etiquetas, etapa del embudo, próximo seguimiento, qué busca (operación, tipo, zona, presupuesto en Bs o USD, dormitorios, forma de pago), notas, propiedades enviadas o de interés (por código) e historial de interacciones.
- **Visitas:** agenda por cliente y código; al marcarlas como realizadas quedan en el historial del cliente.
- **Estadísticas:** clientes nuevos, cierres, comisión, tasa de cierre, embudo, origen de los clientes y motivos de pérdida.
- **Ajustes:** tipo de cambio, comisión habitual, días entre seguimientos, saludo de WhatsApp, tema claro u oscuro, respaldo JSON y exportación a Excel (CSV).

### Códigos de propiedad

Puedes escribir `DOM-000123`, `dom-123` o solo `123`: siempre se guarda como `DOM-000123` (6 dígitos).

### Automatismos

- Al tocar **WhatsApp** o **Llamar**, se registra en el historial; si el cliente era "Nuevo", pasa a "Contactado" y se programa el siguiente seguimiento (puedes desactivarlo en Ajustes).
- Al agendar una visita, el código se añade a la ficha del cliente y su etapa pasa a "Visita".
- Al marcar un cliente como **Cerrado** puedes anotar el código, el monto y el porcentaje; la comisión se calcula sola (en Bs, usando el tipo de cambio de Ajustes) y alimenta las estadísticas.
- Avisa si ya existe un cliente con el mismo celular.

## Instalar en el celular

1. Publica la carpeta en GitHub Pages: en el repositorio, ve a Settings → Pages, elige la rama y la carpeta `/(root)`.
2. En el celular, abre la dirección `https://…github.io/…` con **Chrome**.
3. En el menú ⋮, toca **Instalar aplicación** (o "Agregar a pantalla principal").

Queda con su icono, se abre a pantalla completa y funciona sin internet. Las actualizaciones llegan solas: aparece un aviso de "versión nueva".

> **¿Y una APK?** Una APK construida desde este mismo código es segura, pero no protege más tus datos y habría que reinstalarla en cada actualización. Lo que evita perder datos es la sincronización con Firebase (abajo).

## Sincronizar tus dos celulares (Firebase, gratis)

1. En console.firebase.google.com, crea un proyecto y luego una **app web** (icono `</>`).
2. Activa **Firestore Database**. En la pestaña Reglas, pega el contenido de `firestore.rules` y publica.
3. En **Authentication → Sign-in method**, activa **Google**. En Configuración → Dominios autorizados, agrega `tu-usuario.github.io`.
4. Copia los valores de `firebaseConfig` al inicio de `firebase.js` (reemplaza los `PEGAR`) y vuelve a publicar.
5. En la app, toca **Iniciar sesión** con la misma cuenta de Google en los dos celulares. El punto verde indica que está sincronizado.

Ahorro de datos: al abrir la app se consulta un solo documento pequeño y se bajan solo los clientes que cambiaron. Al guardar se sube solo el cliente modificado. El SDK de Firebase se descarga una vez y solo si está configurado. Sin configurar Firebase, la app funciona igual, pero los datos quedan solo en ese dispositivo: descarga respaldos JSON de vez en cuando desde Ajustes.

## Al publicar cambios

Cambia el número de `CACHE` en `service-worker.js` (por ejemplo `crm-clientes-v10`) para que los celulares reciban el aviso de versión nueva.
