// Configuración de internacionalización para español
export const LOCALE = 'es-VE'; // Español de Venezuela
export const TIMEZONE = 'America/Caracas'; // Zona horaria de Venezuela (UTC-4)

export const CURRENCY = {
    code: 'VES',
    symbol: 'Bs.',
    name: 'Bolívar Venezolano'
};

export const DATE_FORMAT = {
    short: 'dd/MM/yyyy',
    long: 'dd \'de\' MMMM \'de\' yyyy',
    time: 'HH:mm',
    datetime: 'dd/MM/yyyy HH:mm'
};

export const TRANSLATIONS = {
    common: {
        yes: 'Sí',
        no: 'No',
        cancel: 'Cancelar',
        save: 'Guardar',
        delete: 'Eliminar',
        edit: 'Editar',
        search: 'Buscar',
        filter: 'Filtrar',
        loading: 'Cargando...',
        error: 'Error',
        success: 'Éxito'
    },
    auth: {
        login: 'Iniciar Sesión',
        register: 'Registrarse',
        logout: 'Cerrar Sesión',
        email: 'Correo Electrónico',
        password: 'Contraseña',
        forgotPassword: 'Olvidé mi Contraseña',
        signInAsPatient: 'Ingresar como Paciente',
        signInAsDoctor: 'Ingresar como Médico',
        registerAsPatient: 'Registrarse como Paciente',
        registerAsDoctor: 'Registrarse como Médico'
    },
    specialties: {
        cardiology: 'Cardiología',
        pediatrics: 'Pediatría',
        traumatology: 'Traumatología',
        gynecology: 'Ginecología',
        dermatology: 'Dermatología',
        ophthalmology: 'Oftalmología',
        neurology: 'Neurología',
        endocrinology: 'Endocrinología',
        urology: 'Urología',
        psychiatry: 'Psiquiatría'
    },
    days: {
        sunday: 'Domingo',
        monday: 'Lunes',
        tuesday: 'Martes',
        wednesday: 'Miércoles',
        thursday: 'Jueves',
        friday: 'Viernes',
        saturday: 'Sábado'
    },
    appointmentStatus: {
        pending: 'Pendiente',
        confirmed: 'Confirmada',
        completed: 'Completada',
        cancelled: 'Cancelada'
    }
};
