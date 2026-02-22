import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { motion } from 'framer-motion';

const PageWrapper = ({ children, title }) => {
    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <Navbar title={title} />
                <motion.main
                    key={title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950"
                >
                    {children}
                </motion.main>
            </div>
        </div>
    );
};

export default PageWrapper;
