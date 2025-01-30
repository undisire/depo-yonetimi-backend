const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Depo Yönetim Sistemi API',
      version: '1.0.0',
      description: 'Depo Yönetim Sistemi için RESTful API dokümantasyonu',
      contact: {
        name: 'API Desteği',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string'
                },
                status: {
                  type: 'integer'
                }
              }
            }
          }
        },
        Material: {
          type: 'object',
          properties: {
            id: {
              type: 'integer'
            },
            material_code: {
              type: 'string'
            },
            description: {
              type: 'string'
            },
            unit: {
              type: 'string'
            },
            stock_qty: {
              type: 'number'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Request: {
          type: 'object',
          properties: {
            id: {
              type: 'integer'
            },
            project_id: {
              type: 'integer'
            },
            material_id: {
              type: 'integer'
            },
            requested_qty: {
              type: 'number'
            },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected', 'completed']
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Delivery: {
          type: 'object',
          properties: {
            id: {
              type: 'integer'
            },
            request_id: {
              type: 'integer'
            },
            delivery_date: {
              type: 'string',
              format: 'date-time'
            },
            delivered_qty: {
              type: 'number'
            },
            status: {
              type: 'string',
              enum: ['pending', 'completed']
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Project: {
          type: 'object',
          properties: {
            id: {
              type: 'integer'
            },
            project_name: {
              type: 'string'
            },
            pyp_number: {
              type: 'string'
            },
            start_date: {
              type: 'string',
              format: 'date'
            },
            end_date: {
              type: 'string',
              format: 'date'
            },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'cancelled']
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js'] // API route'larının yolu
};

const specs = swaggerJsdoc(options);

module.exports = specs;
