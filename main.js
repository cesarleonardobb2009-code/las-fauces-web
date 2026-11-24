/**
 * ============================================================================
 * PROYECTO: LAS FAUCES - PORTAL INMOBILIARIO Y RESERVACIONES
 * ============================================================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================================================
// 1. CONFIGURACIÓN DE FIREBASE FIRESTORE
// ==========================================================================
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO_ID",
    storageBucket: "TU_PROYECTO.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

let db = null;
if (firebaseConfig.projectId !== "TU_PROYECTO_ID") {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
}

document.addEventListener('DOMContentLoaded', () => {
    // ======================================================================
    // 2. MENÚ HAMBURGUESA INTERACTIVO PARA MÓVIL (EVENTO CLICK - ETAPA 3)
    // ======================================================================
    const btnMenuMovil = document.getElementById('btn-menu-movil');
    const navPrincipal = document.getElementById('nav-principal');

    if (btnMenuMovil && navPrincipal) {
        btnMenuMovil.addEventListener('click', () => {
            const estaAbierto = navPrincipal.classList.toggle('abierto');
            btnMenuMovil.setAttribute('aria-expanded', estaAbierto);
            btnMenuMovil.innerHTML = estaAbierto ? '&#10005;' : '&#9776;'; // Cambia entre ☰ y ✕
        });
    }

    // ======================================================================
    // 3. CATÁLOGO (productos.html): Carrusel, Buscador y Enlaces dinámicos
    // ======================================================================
    const tarjetas = document.querySelectorAll('.tarjeta-inmueble');

    if (tarjetas.length > 0) {
        document.querySelectorAll('.carrusel-contenedor').forEach(carrusel => {
            const pista = carrusel.querySelector('.carrusel-pista');
            const total = pista.children.length;
            const contador = carrusel.querySelector('.contador-fotos');

            pista.addEventListener('scroll', () => {
                const indice = Math.round(pista.scrollLeft / (pista.clientWidth || 1)) + 1;
                contador.textContent = `${Math.min(Math.max(indice, 1), total)} / ${total}`;
            });

            carrusel.querySelector('.prev').addEventListener('click', () => {
                const ancho = pista.clientWidth;
                pista.scrollTo({
                    left: pista.scrollLeft <= 5 ? ancho * (total - 1) : pista.scrollLeft - ancho,
                    behavior: 'smooth'
                });
            });

            carrusel.querySelector('.next').addEventListener('click', () => {
                const ancho = pista.clientWidth;
                pista.scrollTo({
                    left: pista.scrollLeft + ancho >= pista.scrollWidth - 5 ? 0 : pista.scrollLeft + ancho,
                    behavior: 'smooth'
                });
            });
        });

        tarjetas.forEach(tarjeta => {
            const titulo = tarjeta.querySelector('.titulo-inmueble').textContent.trim();
            const btnContactar = tarjeta.querySelector('.btn-contactar-card');
            if (btnContactar) {
                btnContactar.href = `contacto.html?casa=${encodeURIComponent(titulo)}`;
            }
        });

        const inputTexto = document.getElementById('filtro-texto');
        const selectRec = document.getElementById('filtro-recamaras');
        const selectPrecio = document.getElementById('filtro-precio');
        const btnLimpiar = document.getElementById('btn-limpiar');
        const btnResetVacio = document.getElementById('btn-reset-vacio');
        const tituloResultados = document.getElementById('contador-resultados');
        const mensajeVacio = document.getElementById('mensaje-sin-resultados');

        const filtrarCasas = () => {
            const texto = inputTexto.value.toLowerCase().trim();
            const minRec = parseInt(selectRec.value, 10);
            const maxPrecio = parseInt(selectPrecio.value, 10);
            let visibles = 0;

            tarjetas.forEach(tarjeta => {
                const contenido = tarjeta.textContent.toLowerCase();
                const precio = parseInt(tarjeta.querySelector('.precio-inmueble').textContent.replace(/[^0-9]/g, ''), 10) || 0;
                const recamaras = parseInt(tarjeta.querySelectorAll('.datos-tecnicos li')[1]?.textContent || '0', 10) || 0;

                if (contenido.includes(texto) && recamaras >= minRec && precio <= maxPrecio) {
                    tarjeta.style.display = '';
                    visibles++;
                } else {
                    tarjeta.style.display = 'none';
                }
            });

            tituloResultados.textContent = `${visibles} ${visibles === 1 ? 'Propiedad encontrada' : 'Propiedades disponibles'} en León, Guanajuato`;
            if (mensajeVacio) mensajeVacio.hidden = visibles > 0;
        };

        const reiniciarFiltros = () => {
            inputTexto.value = '';
            selectRec.value = '0';
            selectPrecio.value = '99999999';
            filtrarCasas();
        };

        inputTexto?.addEventListener('input', filtrarCasas);
        selectRec?.addEventListener('change', filtrarCasas);
        selectPrecio?.addEventListener('change', filtrarCasas);
        btnLimpiar?.addEventListener('click', reiniciarFiltros);
        btnResetVacio?.addEventListener('click', reiniciarFiltros);
    }

    // ======================================================================
    // 4. VALIDACIÓN JS COMPLETA Y RESERVACIONES CON FIREBASE (contacto.html)
    // ======================================================================
    const formularioReserva = document.getElementById('formulario-contacto');

    if (formularioReserva) {
        const parametros = new URLSearchParams(window.location.search);
        const casaElegida = parametros.get('casa');
        const inputNombre = document.getElementById('nombre');
        const inputTelefono = document.getElementById('telefono');
        const inputCorreo = document.getElementById('correo');
        const selectCasa = document.getElementById('casa-seleccionada');
        const inputFechaHora = document.getElementById('fecha-hora-reserva');
        const alertaFechaOcupada = document.getElementById('alerta-fecha-ocupada');

        if (casaElegida && selectCasa) {
            selectCasa.value = casaElegida;
        }

        // Bloquear fechas pasadas en el calendario
        const ahora = new Date();
        ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
        inputFechaHora.min = ahora.toISOString().slice(0, 16);

        // Funciones auxiliares para mostrar/limpiar alertas visuales de validación
        const mostrarErrorCampo = (input, idSpanError, mensaje) => {
            const span = document.getElementById(idSpanError);
            input.classList.add('campo-invalido');
            if (span) {
                span.textContent = `⚠️ ${mensaje}`;
                span.hidden = false;
            }
        };

        const limpiarErrorCampo = (input, idSpanError) => {
            const span = document.getElementById(idSpanError);
            input.classList.remove('campo-invalido');
            if (span) {
                span.textContent = '';
                span.hidden = true;
            }
        };

        // Validación completa de campos obligatorios, teléfono y correo electrónico
        const validarFormularioCompleto = () => {
            let esValido = true;

            // Validar Nombre (mínimo 3 caracteres)
            const nombreVal = inputNombre.value.trim();
            if (nombreVal.length < 3) {
                mostrarErrorCampo(inputNombre, 'error-nombre', 'Ingresa tu nombre completo (mínimo 3 letras).');
                esValido = false;
            } else {
                limpiarErrorCampo(inputNombre, 'error-nombre');
            }

            // Validar Teléfono (exactamente 10 dígitos numéricos)
            const soloDigitos = inputTelefono.value.replace(/\D/g, '');
            if (soloDigitos.length !== 10) {
                mostrarErrorCampo(inputTelefono, 'error-telefono', 'Ingresa un número de teléfono válido a 10 dígitos.');
                esValido = false;
            } else {
                limpiarErrorCampo(inputTelefono, 'error-telefono');
            }

            // Validar Correo Electrónico con expresión regular estándar
            const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            if (!regexEmail.test(inputCorreo.value.trim())) {
                mostrarErrorCampo(inputCorreo, 'error-correo', 'Ingresa un correo electrónico válido (ej. usuario@dominio.com).');
                esValido = false;
            } else {
                limpiarErrorCampo(inputCorreo, 'error-correo');
            }

            // Validar Propiedad seleccionada
            if (!selectCasa.value) {
                mostrarErrorCampo(selectCasa, 'error-propiedad', 'Selecciona una propiedad del listado.');
                esValido = false;
            } else {
                limpiarErrorCampo(selectCasa, 'error-propiedad');
            }

            // Validar Fecha y hora en calendario
            if (!inputFechaHora.value) {
                mostrarErrorCampo(inputFechaHora, 'error-fecha', 'Selecciona la fecha y hora de llegada en el calendario.');
                esValido = false;
            } else {
                limpiarErrorCampo(inputFechaHora, 'error-fecha');
            }

            return esValido;
        };

        // Limpiar errores en tiempo real conforme el usuario corrige
        inputNombre.addEventListener('input', () => limpiarErrorCampo(inputNombre, 'error-nombre'));
        inputTelefono.addEventListener('input', () => limpiarErrorCampo(inputTelefono, 'error-telefono'));
        inputCorreo.addEventListener('input', () => limpiarErrorCampo(inputCorreo, 'error-correo'));
        selectCasa.addEventListener('change', () => limpiarErrorCampo(selectCasa, 'error-propiedad'));
        inputFechaHora.addEventListener('change', () => limpiarErrorCampo(inputFechaHora, 'error-fecha'));

        const generarCodigoUnico = () => {
            const numero = Math.floor(100000 + Math.random() * 900000);
            return `LF-${numero}`;
        };

        const formatearFecha = (isoString) => {
            const fecha = new Date(isoString);
            return fecha.toLocaleString('es-MX', {
                dateStyle: 'full',
                timeStyle: 'short'
            });
        };

        // Consultar disponibilidad en Firebase Firestore
        const verificarDiaOcupado = async (propiedad, fechaHoraIso) => {
            if (!db || !propiedad || !fechaHoraIso) return false;

            const soloDia = fechaHoraIso.split('T')[0];
            const q = query(
                collection(db, "reservaciones"),
                where("propiedad", "==", propiedad),
                where("soloFecha", "==", soloDia)
            );

            const resultados = await getDocs(q);
            let ocupado = false;

            resultados.forEach((documento) => {
                const data = documento.data();
                if (!data.estado.includes('CANCELADA')) {
                    ocupado = true;
                }
            });

            if (alertaFechaOcupada) {
                alertaFechaOcupada.hidden = !ocupado;
            }
            return ocupado;
        };

        selectCasa.addEventListener('change', () => verificarDiaOcupado(selectCasa.value, inputFechaHora.value));
        inputFechaHora.addEventListener('change', () => verificarDiaOcupado(selectCasa.value, inputFechaHora.value));

        // Envío del formulario con validación previa
        formularioReserva.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 1. Ejecutar validación JS antes de enviar
            if (!validarFormularioCompleto()) {
                const primerError = formularioReserva.querySelector('.campo-invalido');
                primerError?.focus();
                return;
            }

            if (!db) {
                alert('⚠️ Primero debes pegar tus credenciales de Firebase en las primeras líneas de main.js.');
                return;
            }

            const btnGuardar = document.getElementById('btn-guardar-reserva');
            btnGuardar.disabled = true;
            btnGuardar.textContent = 'Verificando disponibilidad...';

            const propiedadSeleccionada = selectCasa.value;
            const fechaHoraSeleccionada = inputFechaHora.value;
            const soloDia = fechaHoraSeleccionada.split('T')[0];

            try {
                // 2. Verificar que la propiedad no esté ocupada ese día en Firebase
                const yaOcupado = await verificarDiaOcupado(propiedadSeleccionada, fechaHoraSeleccionada);

                if (yaOcupado) {
                    alertaFechaOcupada.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    btnGuardar.disabled = false;
                    btnGuardar.textContent = 'Confirmar Reservación y Generar Código';
                    return;
                }

                // 3. Guardar en Firestore
                btnGuardar.textContent = 'Guardando reservación...';
                const codigo = generarCodigoUnico();
                const datosReserva = {
                    codigo: codigo,
                    nombre: inputNombre.value.trim(),
                    telefono: inputTelefono.value.trim(),
                    correo: inputCorreo.value.trim(),
                    huespedes: document.getElementById('huespedes').value,
                    propiedad: propiedadSeleccionada,
                    fechaHora: fechaHoraSeleccionada,
                    soloFecha: soloDia,
                    metodoPago: 'Efectivo en recepción del hotel',
                    notas: document.getElementById('mensaje').value.trim() || 'Sin notas adicionales',
                    estado: 'ACTIVA (Pago pendiente en hotel)',
                    creadaEn: new Date().toISOString()
                };

                await setDoc(doc(db, "reservaciones", codigo), datosReserva);

                document.getElementById('codigo-generado-texto').textContent = codigo;
                const cajaConfirmacion = document.getElementById('confirmacion-envio');
                cajaConfirmacion.hidden = false;
                cajaConfirmacion.scrollIntoView({ behavior: 'smooth' });

                document.getElementById('input-codigo-consulta').value = codigo;
                formularioReserva.reset();
                if (alertaFechaOcupada) alertaFechaOcupada.hidden = true;
            } catch (error) {
                console.error("Error al procesar en Firebase:", error);
                alert("Ocurrió un error al conectar con Firebase. Verifica que tu Firestore esté en modo de prueba.");
            } finally {
                btnGuardar.disabled = false;
                btnGuardar.textContent = 'Confirmar Reservación y Generar Código';
            }
        });

        // ==================================================================
        // 5. MINI FORMULARIO: CONSULTAR RECIBO, IMPRIMIR PDF Y CANCELAR
        // ==================================================================
        const formBuscar = document.getElementById('form-buscar-reserva');
        const inputCodigo = document.getElementById('input-codigo-consulta');
        const textoError = document.getElementById('mensaje-error-codigo');
        const panelRecibo = document.getElementById('panel-recibo-detalle');
        const btnCancelar = document.getElementById('btn-cancelar-reserva');
        const btnImprimirPdf = document.getElementById('btn-imprimir-pdf');

        let codigoActualAbierto = null;

        const mostrarRecibo = (datos) => {
            codigoActualAbierto = datos.codigo;
            document.getElementById('rec-codigo').textContent = datos.codigo;
            document.getElementById('rec-estado').textContent = datos.estado;
            document.getElementById('rec-nombre').textContent = datos.nombre;
            document.getElementById('rec-telefono').textContent = datos.telefono;
            document.getElementById('rec-correo').textContent = datos.correo;
            document.getElementById('rec-propiedad').textContent = datos.propiedad;
            document.getElementById('rec-fecha').textContent = formatearFecha(datos.fechaHora);
            document.getElementById('rec-personas').textContent = datos.huespedes;
            document.getElementById('rec-pago').textContent = datos.metodoPago;
            document.getElementById('rec-notas').textContent = datos.notas;

            if (datos.estado.includes('CANCELADA')) {
                btnCancelar.disabled = true;
                btnCancelar.textContent = 'Reservación Cancelada';
            } else {
                btnCancelar.disabled = false;
                btnCancelar.textContent = 'Cancelar Reservación';
            }

            textoError.hidden = true;
            panelRecibo.hidden = false;
            panelRecibo.scrollIntoView({ behavior: 'smooth' });
        };

        formBuscar.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!db) {
                alert('⚠️ Primero debes pegar tus credenciales de Firebase en main.js.');
                return;
            }

            const codigoBuscado = inputCodigo.value.trim().toUpperCase();

            try {
                const docRef = doc(db, "reservaciones", codigoBuscado);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    mostrarRecibo(docSnap.data());
                } else {
                    panelRecibo.hidden = true;
                    textoError.textContent = `No se encontró ninguna reservación con el código "${codigoBuscado}". Verifica que esté bien escrito.`;
                    textoError.hidden = false;
                }
            } catch (error) {
                console.error("Error al consultar Firebase:", error);
                textoError.textContent = "Error al consultar la base de datos.";
                textoError.hidden = false;
            }
        });

        btnImprimirPdf.addEventListener('click', () => {
            window.print();
        });

        btnCancelar.addEventListener('click', async () => {
            if (!codigoActualAbierto || !db) return;

            const confirmar = confirm(`¿Estás seguro de que deseas cancelar la reservación ${codigoActualAbierto}? El día volverá a quedar disponible.`);
            if (!confirmar) return;

            try {
                const docRef = doc(db, "reservaciones", codigoActualAbierto);
                await updateDoc(docRef, {
                    estado: 'CANCELADA POR EL USUARIO'
                });

                document.getElementById('rec-estado').textContent = 'CANCELADA POR EL USUARIO';
                btnCancelar.disabled = true;
                btnCancelar.textContent = 'Reservación Cancelada';
                alert(`La reservación ${codigoActualAbierto} ha sido cancelada correctamente.`);
            } catch (error) {
                console.error("Error al cancelar:", error);
                alert("No se pudo cancelar la reservación. Intenta nuevamente.");
            }
        });
    }
});