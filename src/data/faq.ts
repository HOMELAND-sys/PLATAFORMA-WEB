// Preguntas frecuentes del sitio. Textos generales: los plazos y cargos concretos
// salen de Configuraciones → Políticas y de cada tour.

export interface Faq {
  q: string;
  a: string;
}

export interface FaqGroup {
  title: string;
  items: Faq[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: 'Reservas',
    items: [
      {
        q: '¿Cómo reservo un tour?',
        a: 'Entra a la ficha del tour, elige cuántas personas viajan y una fecha con cupo, y completa los datos de los viajeros. Al confirmar recibes tu voucher con el código de reserva. Todo el proceso toma unos minutos.',
      },
      {
        q: '¿Necesito una cuenta para reservar?',
        a: 'Sí. La cuenta es gratuita y te permite ver tus reservas, descargar tus vouchers y cancelar si cambian tus planes. Solo te pedimos nombre, correo y una contraseña.',
      },
      {
        q: '¿Las fechas que veo tienen cupo real?',
        a: 'Sí. El calendario muestra las salidas abiertas y los lugares que quedan en cada una. Cuando reservas, tu lugar queda apartado en ese momento.',
      },
      {
        q: '¿Con cuánta anticipación debo reservar?',
        a: 'Cada salida tiene una hora límite de reserva, normalmente 24 horas antes. Si la fecha que buscas ya no aparece o viajas con un grupo grande, escríbenos y vemos opciones.',
      },
      {
        q: '¿Puedo reservar para un grupo grande?',
        a: 'La reserva online admite hasta 8 viajeros. Para grupos más grandes, colegios o empresas, pídenos un viaje a medida y te armamos una propuesta.',
      },
    ],
  },
  {
    title: 'Precios y pagos',
    items: [
      {
        q: '¿Los precios son por persona?',
        a: 'Sí, todos los precios están en dólares estadounidenses y son por persona. En los tours privados el precio por persona baja a medida que el grupo es más grande; la tabla completa está en la ficha de cada tour.',
      },
      {
        q: '¿Cuándo y cómo pago?',
        a: 'Al reservar no se te cobra nada: tu lugar queda apartado y en tu voucher encuentras las instrucciones para pagar con enlace de pago o código QR. Cuando registramos tu pago, la reserva pasa a "Confirmada".',
      },
      {
        q: '¿Qué pasa si no pago a tiempo?',
        a: 'Una reserva pendiente de pago puede ser liberada por la operadora para dar el lugar a otro viajero. Si necesitas más tiempo, avísanos antes.',
      },
      {
        q: '¿Hay cargos ocultos?',
        a: 'No. El total que ves antes de confirmar es lo que pagas. Lo que no está incluido (por ejemplo, la entrada a un parque nacional) se indica en la sección "No incluye" de cada tour.',
      },
    ],
  },
  {
    title: 'Cambios y cancelaciones',
    items: [
      {
        q: '¿Puedo cancelar mi reserva?',
        a: 'Sí. Puedes cancelar desde "Mis reservas". Si cancelas dentro del plazo indicado en el tour, te reembolsamos el total menos el cargo administrativo; pasado ese plazo, o si no te presentas, no hay devolución. Revisa la política de cancelación para el detalle.',
      },
      {
        q: '¿Puedo cambiar la fecha?',
        a: 'Escríbenos con tu código de reserva y revisamos la disponibilidad de la nueva fecha. Los cambios dependen del cupo y de la anticipación.',
      },
      {
        q: '¿Qué pasa si Homeland Tours cancela la salida?',
        a: 'Si una salida no puede operar por clima, bloqueos u otra causa de fuerza mayor, te ofrecemos una nueva fecha o la devolución de lo pagado.',
      },
    ],
  },
  {
    title: 'Durante el viaje',
    items: [
      {
        q: '¿Qué incluye cada tour?',
        a: 'Cada ficha detalla qué incluye y qué no: transporte, guía, hospedaje, alimentación y entradas. También verás qué debes llevar.',
      },
      {
        q: '¿Los tours son aptos para todos?',
        a: 'Depende del destino. Varios recorridos superan los 4.000 metros de altitud: revisa la exigencia física y las recomendaciones de salud de cada tour, y consúltanos si tienes alguna condición médica.',
      },
      {
        q: '¿Tienen opciones de comida vegetariana o sin gluten?',
        a: 'Sí. Al reservar eliges el tipo de comida de cada viajero. Si tienes alergias u otra necesidad, cuéntanos con anticipación.',
      },
      {
        q: '¿En qué idioma es el guiado?',
        a: 'Los idiomas disponibles se indican en cada tour. La mayoría se ofrece en español y varios también en inglés.',
      },
    ],
  },
];

export const FAQ_HOME: Faq[] = [
  FAQ_GROUPS[1].items[1],
  FAQ_GROUPS[0].items[2],
  FAQ_GROUPS[2].items[0],
  FAQ_GROUPS[1].items[0],
];
