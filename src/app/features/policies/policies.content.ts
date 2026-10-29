/**
 * Contenido de /politicas, bilingüe. Escrito a partir de lo que el sitio hace de verdad (formulario de
 * contacto, comentarios, estadísticas anónimas de lectura, almacenamiento del navegador); si eso cambia,
 * actualiza este archivo y POLICIES_UPDATED.
 */
export interface PolicyBlock {
  /** Párrafo, o una lista si hay `items` (el párrafo hace entonces de introducción). */
  textEs: string;
  textEn: string;
  itemsEs?: string[];
  itemsEn?: string[];
}

export interface PolicySection {
  id: string;
  titleEs: string;
  titleEn: string;
  blocks: PolicyBlock[];
}

/** Fecha ISO del último cambio de las políticas. */
export const POLICIES_UPDATED = '2026-10-28';

export const POLICIES_OWNER = { name: 'Camilo Andrés Ayala', email: 'kmilo0230@gmail.com', city: 'Bogotá, Colombia' };

export const POLICY_SECTIONS: PolicySection[] = [
  {
    id: 'privacidad',
    titleEs: 'Privacidad y tratamiento de datos',
    titleEn: 'Privacy and data processing',
    blocks: [
      {
        textEs:
          'Este sitio es el portafolio personal de Camilo Andrés Ayala, persona natural con domicilio en Bogotá, Colombia, responsable del tratamiento de los datos que se recogen aquí. Esta política sigue la Ley 1581 de 2012 y el Decreto 1377 de 2013 de protección de datos personales.',
        textEn:
          'This site is the personal portfolio of Camilo Andrés Ayala, an individual based in Bogotá, Colombia, who is responsible for the data collected here. This policy follows Colombian data protection law (Law 1581 of 2012 and Decree 1377 of 2013).',
      },
      {
        textEs: 'Solo se recogen datos cuando tú los envías:',
        textEn: 'Data is only collected when you send it:',
        itemsEs: [
          'Formulario de contacto: tu nombre, tu email, el tema y el mensaje. Sirven únicamente para responderte.',
          'Comentarios: el nombre que escribas y el texto. Solo se publican después de revisarlos.',
        ],
        itemsEn: [
          'Contact form: your name, your email, the topic and the message. They are used only to reply to you.',
          'Comments: the name you type and the text. They are published only after review.',
        ],
      },
      {
        textEs:
          'Para evitar envíos automáticos, el formulario de contacto guarda una huella cifrada (hash con sal) de tu dirección IP, nunca la dirección en sí, y limita los mensajes por hora.',
        textEn:
          'To stop automated submissions, the contact form stores a salted hash of your IP address, never the address itself, and limits messages per hour.',
      },
      {
        textEs:
          'Además, el sitio cuenta visitas de forma anónima: la página vista, el idioma y, en los proyectos, hasta dónde se leyó y durante cuántos segundos. Estos datos no te identifican y sirven para saber qué contenido resulta útil.',
        textEn:
          'The site also counts visits anonymously: the page viewed, the language and, on project pages, how far down it was read and for how many seconds. This data does not identify you and only shows which content is useful.',
      },
    ],
  },
  {
    id: 'donde',
    titleEs: 'Dónde se guardan y quién los ve',
    titleEn: 'Where it is stored and who sees it',
    blocks: [
      {
        textEs: 'Los datos no se venden ni se ceden. Para funcionar, el sitio usa estos servicios:',
        textEn: 'Data is never sold or shared. To work, the site relies on these services:',
        itemsEs: [
          'Supabase: base de datos donde se guardan los mensajes, los comentarios y las estadísticas anónimas.',
          'Web3Forms: envía una copia de tu mensaje de contacto a mi correo.',
          'Vercel: aloja el sitio; como cualquier servidor web, puede registrar datos técnicos de las peticiones.',
          'Google Fonts: sirve las tipografías del sitio, por lo que tu navegador se conecta a sus servidores.',
        ],
        itemsEn: [
          'Supabase: the database that stores messages, comments and anonymous statistics.',
          'Web3Forms: emails a copy of your contact message to me.',
          'Vercel: hosts the site; like any web server, it may log technical request data.',
          'Google Fonts: serves the site fonts, so your browser connects to its servers.',
        ],
      },
      {
        textEs:
          'Solo yo tengo acceso al panel donde se leen los mensajes. No hay borrado automático: los datos se conservan hasta que yo los elimine o tú pidas que se borren.',
        textEn:
          'Only I have access to the panel where messages are read. There is no automatic deletion: data is kept until I remove it or you ask for it to be deleted.',
      },
    ],
  },
  {
    id: 'derechos',
    titleEs: 'Tus derechos',
    titleEn: 'Your rights',
    blocks: [
      {
        textEs: 'Como titular de tus datos puedes, en cualquier momento:',
        textEn: 'As the owner of your data you can, at any time:',
        itemsEs: [
          'Conocer qué datos tuyos están guardados.',
          'Pedir que se corrijan o actualicen.',
          'Pedir que se borren o revocar la autorización para usarlos.',
          'Presentar una queja ante la Superintendencia de Industria y Comercio (SIC) si consideras que no se respetaron estos derechos.',
        ],
        itemsEn: [
          'Know which of your data is stored.',
          'Ask for it to be corrected or updated.',
          'Ask for it to be deleted, or withdraw your consent to its use.',
          'File a complaint with the Colombian data protection authority (Superintendencia de Industria y Comercio) if you believe these rights were not respected.',
        ],
      },
      {
        textEs:
          'Para ejercerlos, escribe a kmilo0230@gmail.com desde el email con el que me contactaste. Las consultas se responden en un máximo de 10 días hábiles y los reclamos en un máximo de 15 días hábiles, como indica la ley.',
        textEn:
          'To exercise them, write to kmilo0230@gmail.com from the email you contacted me with. Queries are answered within 10 business days and claims within 15 business days, as the law requires.',
      },
    ],
  },
  {
    id: 'almacenamiento',
    titleEs: 'Almacenamiento local',
    titleEn: 'Local storage',
    blocks: [
      {
        textEs:
          'El sitio no usa cookies de publicidad ni herramientas de seguimiento de terceros. Solo guarda en tu navegador (localStorage) algunas preferencias para que no tengas que repetirlas:',
        textEn:
          'The site uses no advertising cookies and no third-party tracking tools. It only keeps a few preferences in your browser (localStorage) so you do not have to set them again:',
        itemsEs: [
          'El tema de día o de noche.',
          'Si el sonido está activado.',
          'Que ya viste la animación de entrada.',
          'La configuración visual de la escena de fondo.',
          'La hora de tu último comentario, para evitar envíos repetidos.',
        ],
        itemsEn: [
          'The day or night theme.',
          'Whether sound is on.',
          'That you already saw the intro animation.',
          'The visual settings of the background scene.',
          'The time of your last comment, to prevent repeated submissions.',
        ],
      },
      {
        textEs: 'Estos datos nunca salen de tu navegador y puedes borrarlos cuando quieras desde su configuración.',
        textEn: 'This data never leaves your browser and you can clear it at any time from its settings.',
      },
    ],
  },
  {
    id: 'propiedad',
    titleEs: 'Propiedad intelectual',
    titleEn: 'Intellectual property',
    blocks: [
      {
        textEs:
          'El diseño, el código y los textos de este sitio son obra de Camilo Andrés Ayala. Los proyectos que aparecen en el portafolio pertenecen a sus autores o a los clientes para los que se hicieron, y se muestran con fines de presentación profesional.',
        textEn:
          'The design, code and text of this site are the work of Camilo Andrés Ayala. The projects shown in the portfolio belong to their authors or to the clients they were made for, and are shown for professional presentation.',
      },
      {
        textEs:
          'No se permite copiar, reutilizar ni redistribuir este material sin autorización por escrito. Si quieres usar algo, escríbeme y lo hablamos.',
        textEn: 'Copying, reusing or redistributing this material without written permission is not allowed. If you want to use something, write to me and we can talk.',
      },
    ],
  },
  {
    id: 'cambios',
    titleEs: 'Cambios en estas políticas',
    titleEn: 'Changes to these policies',
    blocks: [
      {
        textEs: 'Si el sitio empieza a recoger datos nuevos o cambia la forma de usarlos, esta página se actualizará y cambiará la fecha de arriba.',
        textEn: 'If the site starts collecting new data or changes how it is used, this page will be updated along with the date above.',
      },
    ],
  },
];
