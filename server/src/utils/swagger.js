import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Brioright API Documentation',
            version: '1.0.0',
            description: 'API Documentation for the Task Management SaaS',
        },
        servers: [
            {
                url: process.env.NODE_ENV === 'production' 
                    ? 'https://brioright.online' 
                    : `http://localhost:${process.env.PORT || 5000}`,
                description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'token',
                    description: 'JWT token stored in http-only cookie',
                },
            },
        },
    },
    apis: ['./src/routes/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
