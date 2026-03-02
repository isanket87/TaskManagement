import { getProjects } from './src/controllers/projectController.js';

async function run() {
    const req = {
        workspace: { id: 'cf664ade-8128-4757-9236-55be2ec30582' },
        user: { id: '1a1f08d3-d35a-4bf7-a4dd-ae15f940d7d5' }
    };

    const res = {
        status: (code) => {
            console.log('Status:', code);
            return res;
        },
        json: (data) => {
            console.log('JSON Length:', JSON.stringify(data).length);
            console.log('JSON Data:', JSON.stringify(data, null, 2));
        }
    };

    const next = (err) => console.error('Next called with error:', err);

    await getProjects(req, res, next);
}

run().catch(console.error);
