/**
 * ============================================================================
 * PROYECTO: LAS FAUCES - PORTAL INMOBILIARIO Y RESERVACIONES
 * ETAPA 3 Y 4: LÓGICA DEL CLIENTE + PANEL DE ADMINISTRADOR FIRESTORE
 * ============================================================================
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc,
    collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================================================
// 1. CONFIGURACIÓN DE FIREBASE FIRESTORE (PROYECTO: las-fauces-3a9f0)
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBr6I6QqNPSAC36NmM6Fo2eW1m75C7VAg8",
    authDomain: "las-fauces-3a9f0.firebaseapp.com",
    projectId: "las-fauces-3a9f0",
    storageBucket: "las-fauces-3a9f0.firebasestorage.app",
    messagingSenderId: "23106711536",
    appId: "1:23106711536:web:f874f29dfeacfcd628b735"
};

const CLAVE_ADMIN = "AdminFauces2026"; // Clave para entrar al panel administrador

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper para generar un ID seguro de documento en Firestore a partir del nombre de la casa
const crearIdPropiedad = (nombre) =>
    nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");

// Obtener lista de nombres de propiedades marcadas como VENDIDA en Firestore
const obtenerPropiedadesVendidas = async () => {
    const vendidas = new Set();
    try {
        const snap = await getDocs(collection(db, "propiedades_estado"));
        snap.forEach((d) => {
            const info = d.data();
            if (info.vendida === true && info.nombre) {
                vendidas.add(info.nombre.trim());
            }
        });
    } catch (error) {
        console.error("Error al leer propiedades vendidas:", error);
    }
    return vendidas;
};

document.addEventListener('DOMContentLoaded', async () => {
    // ======================================================================
    // 2. MENÚ HAMBURGUESA INTERACTIVO PARA MÓVIL (EVENTO CLICK - ETAPA 3)
    // ======================================================================
    const btnMenuMovil = document.getElementById('btn-menu-movil');
    const navPrincipal = document.getElementById('nav-principal');

    if (btnMenuMovil && navPrincipal) {
        btnMenuMovil.addEventListener('click', () => {
            const estaAbierto = navPrincipal.classList.toggle('abierto');
            btnMenuMovil.setAttribute('aria-expanded', estaAbierto);
            btnMenuMovil.innerHTML = estaAbierto ? '&#10005;' : '&#9776;';
        });
    }

    // Consultar propiedades vendidas al cargar cualquier página
    const casasVendidas = await obtenerPropiedadesVendidas();

    // ======================================================================
    // 3. CATÁLOGO (productos.html): Carrusel, Buscador y Etiqueta "VENDIDA"
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

            // Si la propiedad fue marcada como VENDIDA por el admin
            if (casasVendidas.has(titulo)) {
                tarjeta.classList.add('propiedad-vendida');

                const sello = document.createElement('span');
                sello.className = 'etiqueta-vendida';
                sello.textContent = 'VENDIDA · NO DISPONIBLE';
                tarjeta.prepend(sello);

                if (btnContactar) {
                    btnContactar.textContent = 'Propiedad Vendida';
                    btnContactar.removeAttribute('href');
                    btnContactar.classList.add('btn-deshabilitado');
                    btnContactar.setAttribute('aria-disabled', 'true');
                }
            } else if (btnContactar) {
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
        const avisoGeneralError = document.getElementById('aviso-general-formulario');

        // Enlace Admin dentro del menú hamburguesa (solo en contacto.html)
        const linkMenuAdmin = document.getElementById('link-menu-admin');
        const acordeonAdmin = document.getElementById('acordeon-admin');

        linkMenuAdmin?.addEventListener('click', () => {
            if (navPrincipal?.classList.contains('abierto')) {
                navPrincipal.classList.remove('abierto');
                btnMenuMovil?.setAttribute('aria-expanded', 'false');
                if (btnMenuMovil) btnMenuMovil.innerHTML = '&#9776;';
            }
            if (acordeonAdmin) {
                acordeonAdmin.open = true;
                acordeonAdmin.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

        // Deshabilitar en el <select> las propiedades marcadas como VENDIDAS
        if (selectCasa) {
            Array.from(selectCasa.options).forEach((opt) => {
                if (opt.value && casasVendidas.has(opt.value.trim())) {
                    opt.disabled = true;
                    opt.textContent = `${opt.value} (VENDIDA)`;
                }
            });

            if (casaElegida && !casasVendidas.has(casaElegida.trim())) {
                selectCasa.value = casaElegida;
            }
        }

        // Bloquear fechas pasadas en el calendario
        const ahora = new Date();
        ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
        inputFechaHora.min = ahora.toISOString().slice(0, 16);

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

        const validarFormularioCompleto = () => {
            let esValido = true;

            if (inputNombre.value.trim().length < 3) {
                mostrarErrorCampo(inputNombre, 'error-nombre', 'Ingresa tu nombre completo (mínimo 3 letras).');
                esValido = false;
            } else {
                limpiarErrorCampo(inputNombre, 'error-nombre');
            }

            const soloDigitos = inputTelefono.value.replace(/\D/g, '');
            if (soloDigitos.length !== 10) {
                mostrarErrorCampo(inputTelefono, 'error-telefono', 'Ingresa un número de teléfono válido a 10 dígitos.');
                esValido = false;
            } else {
                limpiarErrorCampo(inputTelefono, 'error-telefono');
            }

            const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
            if (!regexEmail.test(inputCorreo.value.trim())) {
                mostrarErrorCampo(inputCorreo, 'error-correo', 'Ingresa un correo electrónico válido (ej. usuario@dominio.com).');
                esValido = false;
            } else {
                limpiarErrorCampo(inputCorreo, 'error-correo');
            }

            if (!selectCasa.value || casasVendidas.has(selectCasa.value.trim())) {
                mostrarErrorCampo(selectCasa, 'error-propiedad', 'Selecciona una propiedad disponible del listado.');
                esValido = false;
            } else {
                limpiarErrorCampo(selectCasa, 'error-propiedad');
            }

            if (!inputFechaHora.value) {
                mostrarErrorCampo(inputFechaHora, 'error-fecha', 'Selecciona la fecha y hora de llegada en el calendario.');
                esValido = false;
            } else {
                limpiarErrorCampo(inputFechaHora, 'error-fecha');
            }

            return esValido;
        };

        inputNombre.addEventListener('input', () => limpiarErrorCampo(inputNombre, 'error-nombre'));
        inputTelefono.addEventListener('input', () => limpiarErrorCampo(inputTelefono, 'error-telefono'));
        inputCorreo.addEventListener('input', () => limpiarErrorCampo(inputCorreo, 'error-correo'));
        selectCasa.addEventListener('change', () => limpiarErrorCampo(selectCasa, 'error-propiedad'));
        inputFechaHora.addEventListener('change', () => limpiarErrorCampo(inputFechaHora, 'error-fecha'));

        const generarCodigoUnico = () => `LF-${Math.floor(100000 + Math.random() * 900000)}`;

        const formatearFecha = (isoString) => {
            const fecha = new Date(isoString);
            return fecha.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' });
        };

        const verificarDiaOcupado = async (propiedad, fechaHoraIso) => {
            if (!propiedad || !fechaHoraIso) return false;

            const soloDia = fechaHoraIso.split('T')[0];
            const horaSolicitadaMs = new Date(fechaHoraIso).getTime();
            const dosHorasMs = 2 * 60 * 60 * 1000;

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
                    const horaExistenteMs = new Date(data.fechaHora).getTime();
                    if (Math.abs(horaSolicitadaMs - horaExistenteMs) < dosHorasMs) {
                        ocupado = true;
                    }
                }
            });

            if (alertaFechaOcupada) {
                alertaFechaOcupada.hidden = !ocupado;
            }
            return ocupado;
        };

        selectCasa.addEventListener('change', () => verificarDiaOcupado(selectCasa.value, inputFechaHora.value));
        inputFechaHora.addEventListener('change', () => verificarDiaOcupado(selectCasa.value, inputFechaHora.value));

        formularioReserva.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!validarFormularioCompleto()) {
                if (avisoGeneralError) avisoGeneralError.hidden = false;
                formularioReserva.querySelector('.campo-invalido')?.focus();
                return;
            }
            if (avisoGeneralError) avisoGeneralError.hidden = true;

            const btnGuardar = document.getElementById('btn-guardar-reserva');
            btnGuardar.disabled = true;
            btnGuardar.textContent = 'Verificando disponibilidad...';

            const propiedadSeleccionada = selectCasa.value;
            const fechaHoraSeleccionada = inputFechaHora.value;
            const soloDia = fechaHoraSeleccionada.split('T')[0];

            try {
                const yaOcupado = await verificarDiaOcupado(propiedadSeleccionada, fechaHoraSeleccionada);

                if (yaOcupado) {
                    alertaFechaOcupada.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    btnGuardar.disabled = false;
                    btnGuardar.textContent = 'Confirmar Reservación y Generar Código';
                    return;
                }

                btnGuardar.textContent = 'Guardando reservación...';
                const codigo = generarCodigoUnico();
                const datosReserva = {
                    codigo,
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
        // 5. CONSULTAR RECIBO, IMPRIMIR PDF Y CANCELAR
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
            const codigoBuscado = inputCodigo.value.trim().toUpperCase();

            try {
                const docSnap = await getDoc(doc(db, "reservaciones", codigoBuscado));
                if (docSnap.exists()) {
                    mostrarRecibo(docSnap.data());
                } else {
                    panelRecibo.hidden = true;
                    textoError.textContent = `No se encontró ninguna reservación con el código "${codigoBuscado}".`;
                    textoError.hidden = false;
                }
            } catch (error) {
                console.error("Error al consultar Firebase:", error);
                textoError.textContent = "Error al consultar la base de datos.";
                textoError.hidden = false;
            }
        });

        btnImprimirPdf.addEventListener('click', () => window.print());

        btnCancelar.addEventListener('click', async () => {
            if (!codigoActualAbierto) return;
            if (!confirm(`¿Estás seguro de que deseas cancelar la reservación ${codigoActualAbierto}?`)) return;

            try {
                await updateDoc(doc(db, "reservaciones", codigoActualAbierto), {
                    estado: 'CANCELADA POR EL USUARIO'
                });
                document.getElementById('rec-estado').textContent = 'CANCELADA POR EL USUARIO';
                btnCancelar.disabled = true;
                btnCancelar.textContent = 'Reservación Cancelada';
                alert(`La reservación ${codigoActualAbierto} ha sido cancelada correctamente.`);
            } catch (error) {
                console.error("Error al cancelar:", error);
                alert("No se pudo cancelar la reservación.");
            }
        });

        // ==================================================================
        // 6. PANEL DE ADMINISTRADOR (EDITAR/BORRAR CITAS Y CASAS VENDIDAS)
        // ==================================================================
        const btnAdminEntrar = document.getElementById('btn-admin-entrar');
        const btnAdminSalir = document.getElementById('btn-admin-salir');
        const inputAdminPass = document.getElementById('admin-password');
        const errorAdminLogin = document.getElementById('admin-error-login');
        const boxLoginAdmin = document.getElementById('admin-login-box');
        const boxContenidoAdmin = document.getElementById('admin-contenido');
        const adminSelectPropiedad = document.getElementById('admin-select-propiedad');
        const btnMarcarVendida = document.getElementById('btn-marcar-vendida');
        const btnMarcarDisponible = document.getElementById('btn-marcar-disponible');
        const listaCasasVendidas = document.getElementById('lista-casas-vendidas');
        const btnRecargarReservas = document.getElementById('btn-recargar-reservas');
        const contenedorTablaAdmin = document.getElementById('contenedor-tabla-admin');

        // Copiar opciones de propiedades del formulario al selector del administrador
        if (adminSelectPropiedad && selectCasa) {
            Array.from(selectCasa.options).forEach((opt) => {
                if (opt.value) {
                    const nuevaOpt = document.createElement('option');
                    nuevaOpt.value = opt.value;
                    nuevaOpt.textContent = opt.value;
                    adminSelectPropiedad.appendChild(nuevaOpt);
                }
            });
        }

        const renderizarListaVendidas = async () => {
            if (!listaCasasVendidas) return;
            const actuales = await obtenerPropiedadesVendidas();
            listaCasasVendidas.innerHTML = '';

            if (actuales.size === 0) {
                listaCasasVendidas.innerHTML = '<li>Todas las propiedades están actualmente disponibles.</li>';
                return;
            }

            actuales.forEach((nombreCasa) => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>🔴 VENDIDA:</strong> ${nombreCasa}`;
                listaCasasVendidas.appendChild(li);
            });
        };

        const cargarReservacionesAdmin = async () => {
            if (!contenedorTablaAdmin) return;
            contenedorTablaAdmin.innerHTML = '<p>Consultando Firestore...</p>';

            try {
                const snap = await getDocs(collection(db, "reservaciones"));
                if (snap.empty) {
                    contenedorTablaAdmin.innerHTML = '<p>No hay reservaciones registradas todavía.</p>';
                    return;
                }

                let html = `
                    <table class="tabla-admin-db">
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Cliente</th>
                                <th>Propiedad</th>
                                <th>Fecha y Hora</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                snap.forEach((docu) => {
                    const r = docu.data();
                    html += `
                        <tr>
                            <td><strong>${r.codigo}</strong></td>
                            <td>${r.nombre}<br><small>${r.telefono} · ${r.correo}</small></td>
                            <td>${r.propiedad}</td>
                            <td>${formatearFecha(r.fechaHora)}</td>
                            <td>${r.estado}</td>
                            <td class="acciones-admin-celda">
                                <button type="button" class="btn-mini-confirmar" data-codigo="${r.codigo}">Confirmar</button>
                                <button type="button" class="btn-mini-borrar" data-codigo="${r.codigo}">Eliminar</button>
                            </td>
                        </tr>
                    `;
                });

                html += '</tbody></table>';
                contenedorTablaAdmin.innerHTML = html;

                // Evento para modificar estado a CONFIRMADA
                contenedorTablaAdmin.querySelectorAll('.btn-mini-confirmar').forEach((btn) => {
                    btn.addEventListener('click', async () => {
                        const cod = btn.dataset.codigo;
                        await updateDoc(doc(db, "reservaciones", cod), {
                            estado: 'CONFIRMADA POR ADMINISTRADOR'
                        });
                        alert(`Reservación ${cod} actualizada a CONFIRMADA.`);
                        cargarReservacionesAdmin();
                    });
                });

                // Evento para eliminar documento de Firestore
                contenedorTablaAdmin.querySelectorAll('.btn-mini-borrar').forEach((btn) => {
                    btn.addEventListener('click', async () => {
                        const cod = btn.dataset.codigo;
                        if (!confirm(`¿Eliminar permanentemente la reservación ${cod} de la base de datos?`)) return;
                        await deleteDoc(doc(db, "reservaciones", cod));
                        alert(`Reservación ${cod} eliminada de Firestore.`);
                        cargarReservacionesAdmin();
                    });
                });
            } catch (error) {
                console.error("Error en tabla admin:", error);
                contenedorTablaAdmin.innerHTML = '<p>Error al cargar registros de Firestore.</p>';
            }
        };

        btnAdminEntrar?.addEventListener('click', () => {
            if (inputAdminPass.value === CLAVE_ADMIN) {
                errorAdminLogin.hidden = true;
                boxLoginAdmin.hidden = true;
                boxContenidoAdmin.hidden = false;
                renderizarListaVendidas();
                cargarReservacionesAdmin();
            } else {
                errorAdminLogin.hidden = false;
            }
        });

        btnAdminSalir?.addEventListener('click', () => {
            inputAdminPass.value = '';
            boxContenidoAdmin.hidden = true;
            boxLoginAdmin.hidden = false;
        });

        btnMarcarVendida?.addEventListener('click', async () => {
            const prop = adminSelectPropiedad.value;
            if (!prop) return alert('Selecciona primero una propiedad.');

            await setDoc(doc(db, "propiedades_estado", crearIdPropiedad(prop)), {
                nombre: prop,
                vendida: true,
                actualizadoEn: new Date().toISOString()
            });
            alert(`"${prop}" marcada como VENDIDA. Ya no aparecerá disponible en el catálogo ni en el formulario.`);
            renderizarListaVendidas();
        });

        btnMarcarDisponible?.addEventListener('click', async () => {
            const prop = adminSelectPropiedad.value;
            if (!prop) return alert('Selecciona primero una propiedad.');

            await setDoc(doc(db, "propiedades_estado", crearIdPropiedad(prop)), {
                nombre: prop,
                vendida: false,
                actualizadoEn: new Date().toISOString()
            });
            alert(`"${prop}" volvió a estar DISPONIBLE.`);
            renderizarListaVendidas();
        });

        btnRecargarReservas?.addEventListener('click', cargarReservacionesAdmin);
    }
});