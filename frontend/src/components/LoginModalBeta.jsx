/*
================================================================================
|                                                                              |
| 📂 components/LoginModalBeta.jsx (NUEVO)                                     |
|                                                                              |
| Este es el nuevo modal de login de prueba. Es autocontenido y solo maneja    |
| la lógica de la interfaz, sin llamadas a backend.                            |
|                                                                              |
================================================================================
*/
import { useState, useEffect } from 'react';
// import { Mail, ShieldCheck, X, KeyRound } from 'lucide-react';
import { FiMail, FiX, FiKey } from 'react-icons/fi';

export function LoginModalBeta ({ isOpen, onClose }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Limpia el error si el usuario empieza a escribir de nuevo
    useEffect(() => {
        if (error) {
            setError('');
        }
    }, [email, password]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simula una llamada a backend de 2 segundos
        await new Promise(resolve => setTimeout(resolve, 2000));

        setIsLoading(false);
        setError('Acceso incorrecto');
    };
    
    if (!isOpen) return null;

    const isFormValid = email !== '' && password !== '';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-95 animate-[scale-up_0.3s_ease-out_forwards]">
                <style>{`.animate-\\[scale-up_0\\.3s_ease-out_forwards\\] { animation-name: scale-up; } @keyframes scale-up { 0% { transform: scale(0.95); } 100% { transform: scale(1); } }`}</style>
                <div className="p-8 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <FiX size={24} />
                    </button>

                    <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Iniciar Sesión (Beta)</h2>
                    <p className="text-gray-500 mb-6 text-center">Ingresa tus credenciales para continuar.</p>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div className="relative">
                                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="email" placeholder="Correo Electrónico" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="relative">
                                <FiKey className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>

                        {error && <p className="text-red-600 text-sm text-center mt-4">{error}</p>}
                        
                        <div className="mt-6">
                            <button type="submit" disabled={!isFormValid || isLoading} className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
                                {isLoading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                {isLoading ? 'Verificando...' : 'Ingresar'}
                            </button>
                        </div>
                        <div className="text-center mt-4">
                            <div className="text-sm text-indigo-600 hover:underline cursor-pointer">¿Olvidaste tu contraseña?</div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
