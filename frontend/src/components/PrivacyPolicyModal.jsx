// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { Mail, ArrowRight, Star, Zap, ShieldCheck, X, KeyRound } from 'lucide-react';
import { FiX } from 'react-icons/fi';

/*
================================================================================
|                                                                              |
| 📂 components/PrivacyPolicyModal.jsx (NUEVO)                                 |
|                                                                              |
| Este modal mostrará el contenido de tu política de privacidad.               |
|                                                                              |
================================================================================
*/
export function PrivacyPolicyModal ({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 scale-95 animate-[scale-up_0.3s_ease-out_forwards]">
                <style>{`.animate-\\[scale-up_0\\.3s_ease-out_forwards\\] { animation-name: scale-up; } @keyframes scale-up { 0% { transform: scale(0.95); } 100% { transform: scale(1); } }`}</style>
                <div className="p-8 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                        <FiX size={24} />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Política de Privacidad</h2>
                    <div className="flex flex-col max-h-[60vh] overflow-y-auto text-gray-600 gap-y-2">
                        <p><strong>Última Actualización: 15 de octubre de 2024</strong></p>
                        <h3 className="mt-6 font-bold">1. Nuestro Compromiso y Responsable de tus Datos</h3>
                        <p><span>En </span><span>analisis.ferreteros.app</span><span>, tu confianza es nuestra prioridad. Esta política explica de forma directa cómo protegemos tu información personal, en estricto cumplimiento de la Ley de Protección de Datos Personales del Perú (Ley N° 29733) y su Reglamento (D.S. N° 016-2024-JUS).&nbsp;</span></p>
                        <p><span>El responsable del tratamiento de tus datos es:</span></p>
                        <ul>
                            <li><strong>Razón Social:</strong><span> CHRISTIAN ALCIDES BARRETO VELEZ (FERRISUR)</span></li>
                            <li><strong>RUC:</strong><span> 10448034050</span></li>
                            <li><strong>Domicilio:</strong><span>, Perú.</span></li>
                            <li><strong>Email de Contacto:</strong><span>&nbsp;</span><span>privacidad@ferrisur.com</span><span>&nbsp;</span></li>
                        </ul>
                        <h3 className="mt-6 font-bold">2. Qué Información Recopilamos y Para Qué la Usamos</h3>
                        <p><span>Solo te pedimos los datos estrictamente necesarios para ofrecerte y mejorar nuestro servicio.&nbsp;</span></p>
                        <ul>
                            <li><strong>Datos de Cuenta (Nombre, DNI, email, teléfono):</strong><span> Para identificarte, crear tu perfil, comunicarnos contigo y darte soporte.&nbsp;</span></li>
                            <li><strong>Datos de tu Negocio (Nombre comercial, RUC, dirección):</strong><span> Para personalizar la experiencia y ofrecerte resultados relevantes de la aplicación.</span></li>
                            <li><strong>Datos de Uso (Consultas realizadas en la app, funciones utilizadas):</strong><span> Para el funcionamiento de la app (historial, preferencias) y para analizar de forma anónima cómo mejorar nuestras herramientas.&nbsp;</span></li>
                            <li><strong>Datos Técnicos (Dispositivo, IP):</strong><span> Para garantizar la seguridad de tu cuenta y la compatibilidad técnica de la app.&nbsp;</span></li>
                        </ul>
                        <h3 className="mt-6 font-bold">3. Tu Consentimiento</h3>
                        <p><span>Al registrarte y aceptar esta política marcando la casilla correspondiente, nos das tu consentimiento libre, previo, expreso e informado para tratar tus datos según lo aquí descrito. Puedes revocar este consentimiento en cualquier momento enviando un correo a&nbsp;</span></p>
                        <p><span>privacidad@ferrisur.com</span><span>, lo que podría limitar tu acceso al servicio.&nbsp;</span></p>
                        <h3 className="mt-6 font-bold">4. Con Quién Compartimos tu Información</h3>
                        <p><strong>Nunca vendemos tus datos.</strong><span> Solo los compartimos con proveedores tecnológicos esenciales (ej. servicios de alojamiento en la nube) que nos ayudan a operar la app, exigiéndoles altos estándares de seguridad y confidencialidad. Algunos de estos proveedores pueden estar fuera de Perú, pero nos aseguramos de que cumplan con niveles de protección adecuados, según la ley peruana. Excepcionalmente, podríamos compartir tu información si una autoridad competente nos lo exige por ley.&nbsp;</span></p>
                        <h3 className="mt-6 font-bold">5. Tus Derechos ARCO (Acceso, Rectificación, Cancelación, Oposición)</h3>
                        <p><span>Tienes total control sobre tu información. Para ejercer tus derechos ARCO, envía tu solicitud a </span><span>privacidad@ferrisur.com</span><span>, adjuntando una copia de tu DNI y detallando tu petición. El ejercicio de estos derechos es gratuito.&nbsp;</span></p>
                        <ul>
                            <li><strong>Acceso:</strong><span> Para saber qué datos tuyos tratamos (plazo de respuesta: 20 días hábiles).&nbsp;</span></li>
                            <li><strong>Rectificación:</strong><span> Para corregir datos inexactos o incompletos (plazo: 10 días hábiles).&nbsp;</span></li>
                            <li><strong>Cancelación:</strong><span> Para solicitar la eliminación de tus datos (plazo: 10 días hábiles).&nbsp;</span></li>
                            <li><strong>Oposición:</strong><span> Para oponerte a un uso específico de tus datos (plazo: 10 días hábiles).&nbsp;</span></li>
                        </ul>
                        <h3 className="mt-6 font-bold">6. Seguridad y Conservación de tus Datos</h3>
                        <p><span>Protegemos tu información con seriedad, aplicando medidas de seguridad técnicas y organizativas como el cifrado de datos y controles de acceso estrictos para evitar su alteración, pérdida o acceso no autorizado.&nbsp;</span></p>
                        <p><span>Conservaremos tus datos mientras tu cuenta esté activa. Luego, los mantendremos bloqueados solo por el tiempo que la ley exija, para después eliminarlos de forma segura y definitiva.&nbsp;</span></p>
                        <h3 className="mt-6 font-bold">7. Cambios a la Política y Contacto</h3>
                        <p><span>Si realizamos cambios importantes en esta política, te lo notificaremos directamente. Para cualquier duda, contáctanos en&nbsp;</span></p>
                        <p><a href="http://privacidad@ferrisur.com" target="_blank"><u>privacidad@ferrisur.com</u></a><span>. Esta política se rige por las leyes de la República del Perú.&nbsp;</span></p>
                        <br/>
                        <p><span>Christian Barreto</span></p>
                        <p><span>christian@ferrisur.com</span></p>
                    </div>


                    
                    <div className="text-right mt-6">
                        <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
