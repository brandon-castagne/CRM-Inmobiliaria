# Mi CRM Inmobiliario

Aplicación web local para asesores inmobiliarios en Bolivia.

## Abrir en local

1. Descarga y descomprime la carpeta.
2. Mantén todos los archivos juntos.
3. Abre `index.html` con doble clic.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub.
2. Sube todos los archivos de esta carpeta.
3. En Settings > Pages selecciona `main` y `/(root)`.
4. Abre la dirección HTTPS que GitHub genere.

## Instalar como aplicación

Desde la dirección HTTPS de GitHub Pages, abre el menú del navegador y selecciona instalar la aplicación.

## Datos

Los datos se guardan en el navegador. Descarga respaldos JSON periódicamente desde Copias de seguridad. Para compartir la aplicación se puede compartir el repositorio o el enlace de GitHub Pages; los datos de cada navegador son independientes.

## Firebase (opcional, sincroniza entre dispositivos)

1. Crea un proyecto en console.firebase.google.com, activa **Firestore Database** y **Authentication → Google**.
2. En Firestore → Reglas pega el contenido de `firestore.rules` y publica.
3. Authentication → Configuración → Dominios autorizados: agrega `tu-usuario.github.io`.
4. Pega tu `firebaseConfig` al inicio de `firebase.js` (reemplaza los `PEGAR`).
5. Abre la app y pulsa **Iniciar sesión**. Punto verde = sincronizado.

Sin configuración, la app funciona solo en local.

## Al publicar cambios

Cambia el número de `CACHE` (`crm-inmobiliario-vN`) en `service-worker.js` para que aparezca el aviso "Hay una versión nueva".

## Importar propiedades (CSV)

En Propiedades > **Importar CSV**. Desde Excel: Guardar como > CSV UTF-8. Debe tener una columna de código (Código, Cod o Ref); las demás se reconocen por nombre (Zona, Dirección, Operación, Tipo, Precio Bs, Precio USD, Dormitorios, Baños, Terreno, Construcción, Estado, Propietario, Teléfono). Si el código ya existe, se actualiza esa ficha (fotos y documentos no se tocan); si no, se crea. Antes de importar se descarga un respaldo.
