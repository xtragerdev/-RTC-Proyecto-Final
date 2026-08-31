const bearer = [{ bearerAuth: [] }];

const success = (description = 'Operación completada') => ({ description });
const errorResponses = {
  400: { description: 'Petición incorrecta' },
  401: { description: 'Autenticación requerida' },
  403: { description: 'Permiso insuficiente' },
  404: { description: 'Recurso no encontrado' },
  409: { description: 'Conflicto con el estado actual' },
  422: { description: 'Error de validación' },
};

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'ReNodo API',
    version: '1.0.0',
    description:
      'API REST para la red de préstamo comunitario ReNodo. Los intervalos de reserva son [inicio, fin), de modo que dos reservas pueden tocarse sin solaparse.',
  },
  servers: [
    { url: '/api/v1', description: 'Servidor actual' },
    { url: 'http://localhost:4000/api/v1', description: 'Desarrollo local' },
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Users' },
    { name: 'Hubs' },
    { name: 'Items' },
    { name: 'Reservations' },
  ],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Crear una cuenta member',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } },
          },
        },
        responses: { 201: success('Cuenta creada'), ...errorResponses },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } } },
        },
        responses: { 200: success('Token y usuario'), 401: errorResponses[401] },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Perfil actual',
        security: bearer,
        responses: { 200: success(), ...errorResponses },
      },
      patch: {
        tags: ['Auth'],
        summary: 'Actualizar el perfil actual',
        security: bearer,
        responses: { 200: success(), ...errorResponses },
      },
      delete: {
        tags: ['Auth'],
        summary: 'Desactivar la cuenta actual',
        security: bearer,
        responses: { 204: success(), ...errorResponses },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Listar usuarios (admin)',
        security: bearer,
        responses: { 200: success(), ...errorResponses },
      },
    },
    '/users/{id}': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      get: {
        tags: ['Users'],
        summary: 'Detalle propio o admin',
        security: bearer,
        responses: { 200: success(), ...errorResponses },
      },
      patch: {
        tags: ['Users'],
        summary: 'Actualizar perfil',
        security: bearer,
        responses: { 200: success(), ...errorResponses },
      },
      delete: {
        tags: ['Users'],
        summary: 'Desactivar cuenta',
        security: bearer,
        responses: { 204: success(), ...errorResponses },
      },
    },
    '/users/{id}/role': {
      patch: {
        tags: ['Users'],
        summary: 'Cambiar rol (admin)',
        security: bearer,
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: { 200: success(), ...errorResponses },
      },
    },
    '/users/me/favorites/{itemId}': {
      parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
      put: {
        tags: ['Users'],
        summary: 'Añadir favorito sin duplicar',
        security: bearer,
        responses: { 200: success(), ...errorResponses },
      },
      delete: {
        tags: ['Users'],
        summary: 'Eliminar favorito',
        security: bearer,
        responses: { 200: success(), ...errorResponses },
      },
    },
    '/hubs': {
      get: { tags: ['Hubs'], summary: 'Listar nodos', responses: { 200: success() } },
      post: {
        tags: ['Hubs'],
        summary: 'Crear nodo (admin)',
        security: bearer,
        responses: { 201: success(), ...errorResponses },
      },
    },
    '/hubs/{id}': {
      get: {
        tags: ['Hubs'],
        summary: 'Detalle de nodo por id, slug o código',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: success(), 404: errorResponses[404] },
      },
      patch: {
        tags: ['Hubs'],
        summary: 'Editar nodo (manager asignado/admin)',
        security: bearer,
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: { 200: success(), ...errorResponses },
      },
      delete: {
        tags: ['Hubs'],
        summary: 'Archivar nodo (admin)',
        security: bearer,
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: { 204: success(), ...errorResponses },
      },
    },
    '/hubs/{id}/managers/{userId}': {
      parameters: [
        { $ref: '#/components/parameters/Id' },
        { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
      ],
      put: {
        tags: ['Hubs'],
        summary: 'Asignar manager (admin)',
        security: bearer,
        responses: { 200: success(), ...errorResponses },
      },
      delete: {
        tags: ['Hubs'],
        summary: 'Desasignar manager (admin)',
        security: bearer,
        responses: { 200: success(), ...errorResponses },
      },
    },
    '/items': {
      get: {
        tags: ['Items'],
        summary: 'Buscar objetos y filtrar disponibilidad',
        parameters: [
          { name: 'hub', in: 'query', schema: { type: 'string' } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: { 200: success(), 422: errorResponses[422] },
      },
    },
    '/items/{id}': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      get: {
        tags: ['Items'],
        summary: 'Detalle de objeto',
        responses: { 200: success(), 404: errorResponses[404] },
      },
      patch: {
        tags: ['Items'],
        summary: 'Editar objeto (manager/admin)',
        security: bearer,
        responses: { 200: success(), ...errorResponses },
      },
      delete: {
        tags: ['Items'],
        summary: 'Retirar objeto (manager/admin)',
        security: bearer,
        responses: { 204: success(), ...errorResponses },
      },
    },
    '/hubs/{hubId}/items': {
      post: {
        tags: ['Items'],
        summary: 'Crear objeto en un nodo',
        security: bearer,
        parameters: [{ name: 'hubId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 201: success(), ...errorResponses },
      },
    },
    '/reservations': {
      get: {
        tags: ['Reservations'],
        summary: 'Listado según alcance del rol',
        security: bearer,
        responses: { 200: success(), ...errorResponses },
      },
      post: {
        tags: ['Reservations'],
        summary: 'Crear reserva sin solapamientos',
        security: bearer,
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ReservationInput' } },
          },
        },
        responses: { 201: success(), ...errorResponses },
      },
    },
    '/reservations/{id}': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      get: {
        tags: ['Reservations'],
        summary: 'Detalle según alcance',
        security: bearer,
        responses: { 200: success(), ...errorResponses },
      },
      patch: {
        tags: ['Reservations'],
        summary: 'Reprogramar o editar notas',
        security: bearer,
        responses: { 200: success(), ...errorResponses },
      },
      delete: {
        tags: ['Reservations'],
        summary: 'Cancelar',
        security: bearer,
        responses: { 204: success(), ...errorResponses },
      },
    },
    '/reservations/{id}/status': {
      patch: {
        tags: ['Reservations'],
        summary: 'Transición de estado (manager/admin)',
        security: bearer,
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: { 200: success(), ...errorResponses },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    parameters: {
      Id: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
      },
    },
    schemas: {
      RegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          district: { type: 'string' },
          preferredHub: { type: ['string', 'null'] },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
      },
      ReservationInput: {
        type: 'object',
        required: ['item', 'startDate', 'endDate'],
        properties: {
          item: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
          memberNote: { type: 'string', maxLength: 500 },
        },
      },
    },
  },
};
