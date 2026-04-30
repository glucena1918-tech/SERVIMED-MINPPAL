import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea una fecha para Venezuela (zona horaria America/Caracas)
 */
export function formatDate(date: string | Date, pattern: string = 'dd/MM/yyyy'): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, pattern, { locale: es });
}

/**
 * Formatea una hora para Venezuela
 */
export function formatTime(time: string): string {
    return time; // Las horas ya vienen en formato HH:mm
}

/**
 * Formatea fecha y hora completa
 */
export function formatDateTime(datetime: string | Date): string {
    const dateObj = typeof datetime === 'string' ? parseISO(datetime) : datetime;
    return format(dateObj, "dd/MM/yyyy 'a las' HH:mm", { locale: es });
}

/**
 * Obtiene la fecha actual en zona horaria de Venezuela
 */
export function getCurrentDateVE(): Date {
    return new Date();
}

/**
 * Convierte una fecha a formato ISO para Venezuela
 */
export function toISODateVE(date: Date): string {
    return format(date, 'yyyy-MM-dd');
}

/**
 * Obtiene el nombre del día en español
 */
export function getDayNameES(dayOfWeek: number): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayOfWeek];
}

/**
 * Formatea un monto en bolívares venezolanos
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: 'VES',
        minimumFractionDigits: 2
    }).format(amount);
}
