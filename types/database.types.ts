export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            doctors: {
                Row: {
                    avatar_url: string | null
                    bio: string | null
                    cedula: string | null
                    consultation_fee: number | null
                    created_at: string | null
                    education: Json | null
                    experience_years: number | null
                    full_name: string
                    id: string
                    is_active: boolean | null
                    is_verified: boolean | null
                    license_number: string
                    phone: string | null
                    rating: number | null
                    specialty: string
                    total_reviews: number | null
                    updated_at: string | null
                    user_id: string | null
                }
                Insert: {
                    avatar_url?: string | null
                    bio?: string | null
                    cedula?: string | null
                    consultation_fee?: number | null
                    created_at?: string | null
                    education?: Json | null
                    experience_years?: number | null
                    full_name: string
                    id?: string
                    is_active?: boolean | null
                    is_verified?: boolean | null
                    license_number: string
                    phone?: string | null
                    rating?: number | null
                    specialty: string
                    total_reviews?: number | null
                    updated_at?: string | null
                    user_id?: string | null
                }
                Update: {
                    avatar_url?: string | null
                    bio?: string | null
                    cedula?: string | null
                    consultation_fee?: number | null
                    created_at?: string | null
                    education?: Json | null
                    experience_years?: number | null
                    full_name?: string
                    id?: string
                    is_active?: boolean | null
                    is_verified?: boolean | null
                    license_number?: string
                    phone?: string | null
                    rating?: number | null
                    specialty?: string
                    total_reviews?: number | null
                    updated_at?: string | null
                    user_id?: string | null
                }
            }
            patients: {
                Row: {
                    id: string
                    user_id: string | null
                    full_name: string
                    cedula: string | null
                    date_of_birth: string
                    gender: Database["public"]["Enums"]["gender_type"]
                    blood_type: string | null
                    weight: number | null
                    height: number | null
                    agency: string | null
                    department: string | null
                    work_location: string | null
                    contact_phone: string | null
                    emergency_contact_name: string | null
                    emergency_contact_phone: string | null
                    allergies: string[] | null
                    allergies_food: string | null
                    allergies_medicine: string | null
                    medical_devices: string | null
                    chronic_conditions: string | null
                    previous_surgeries: string | null
                    family_diseases: string | null
                    vaccines: string | null
                    emergency_contact: Json | null
                    insurance_provider: string | null
                    insurance_number: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    user_id?: string | null
                    full_name: string
                    cedula?: string | null
                    date_of_birth: string
                    gender: Database["public"]["Enums"]["gender_type"]
                    blood_type?: string | null
                    weight?: number | null
                    height?: number | null
                    agency?: string | null
                    department?: string | null
                    work_location?: string | null
                    contact_phone?: string | null
                    emergency_contact_name?: string | null
                    emergency_contact_phone?: string | null
                    allergies?: string[] | null
                    allergies_food?: string | null
                    allergies_medicine?: string | null
                    medical_devices?: string | null
                    chronic_conditions?: string | null
                    previous_surgeries?: string | null
                    family_diseases?: string | null
                    vaccines?: string | null
                    emergency_contact?: Json | null
                    insurance_provider?: string | null
                    insurance_number?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string | null
                    full_name?: string
                    cedula?: string | null
                    date_of_birth?: string
                    gender?: Database["public"]["Enums"]["gender_type"]
                    blood_type?: string | null
                    weight?: number | null
                    height?: number | null
                    agency?: string | null
                    department?: string | null
                    work_location?: string | null
                    contact_phone?: string | null
                    emergency_contact_name?: string | null
                    emergency_contact_phone?: string | null
                    allergies?: string[] | null
                    allergies_food?: string | null
                    allergies_medicine?: string | null
                    medical_devices?: string | null
                    chronic_conditions?: string | null
                    previous_surgeries?: string | null
                    family_diseases?: string | null
                    vaccines?: string | null
                    emergency_contact?: Json | null
                    insurance_provider?: string | null
                    insurance_number?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
            appointments: {
                Row: {
                    appointment_date: string
                    appointment_time: string
                    cancellation_reason: string | null
                    cancelled_at: string | null
                    created_at: string | null
                    doctor_id: string | null
                    duration: number | null
                    id: string
                    medical_record_id: string | null
                    notes: string | null
                    patient_id: string | null
                    reason: string | null
                    consultation_type: string | null
                    status: Database["public"]["Enums"]["appointment_status"] | null
                    updated_at: string | null
                }
                Insert: {
                    appointment_date: string
                    appointment_time: string
                    cancellation_reason?: string | null
                    cancelled_at?: string | null
                    created_at?: string | null
                    doctor_id?: string | null
                    duration?: number | null
                    id?: string
                    medical_record_id?: string | null
                    notes?: string | null
                    patient_id?: string | null
                    reason?: string | null
                    consultation_type?: string | null
                    status?: Database["public"]["Enums"]["appointment_status"] | null
                    updated_at?: string | null
                }
                Update: {
                    appointment_date?: string
                    appointment_time?: string
                    cancellation_reason?: string | null
                    cancelled_at?: string | null
                    created_at?: string | null
                    doctor_id?: string | null
                    duration?: number | null
                    id?: string
                    medical_record_id?: string | null
                    notes?: string | null
                    patient_id?: string | null
                    reason?: string | null
                    consultation_type?: string | null
                    status?: Database["public"]["Enums"]["appointment_status"] | null
                    updated_at?: string | null
                }
            }
            medical_records: {
                Row: {
                    id: string
                    patient_id: string | null
                    doctor_id: string | null
                    appointment_id: string | null
                    record_date: string
                    diagnosis: string | null
                    symptoms: string | null
                    consultation_type: string | null
                    treatment: string | null
                    treatment_type: string | null
                    treatment_duration: string | null
                    treatment_indications: Json | null
                    requires_rest: boolean | null
                    rest_days: number | null
                    prescriptions: Json | null
                    lab_results: string | null
                    notes: string | null
                    attachments: string[] | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    patient_id?: string | null
                    doctor_id?: string | null
                    appointment_id?: string | null
                    record_date?: string
                    diagnosis?: string | null
                    symptoms?: string | null
                    consultation_type?: string | null
                    treatment?: string | null
                    treatment_type?: string | null
                    treatment_duration?: string | null
                    treatment_indications?: Json | null
                    requires_rest?: boolean | null
                    rest_days?: number | null
                    prescriptions?: Json | null
                    lab_results?: string | null
                    notes?: string | null
                    attachments?: string[] | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    patient_id?: string | null
                    doctor_id?: string | null
                    appointment_id?: string | null
                    record_date?: string
                    diagnosis?: string | null
                    symptoms?: string | null
                    consultation_type?: string | null
                    treatment?: string | null
                    treatment_type?: string | null
                    treatment_duration?: string | null
                    treatment_indications?: Json | null
                    requires_rest?: boolean | null
                    rest_days?: number | null
                    prescriptions?: Json | null
                    lab_results?: string | null
                    notes?: string | null
                    attachments?: string[] | null
                    created_at?: string | null
                    updated_at?: string | null
                }
            }
        }
        Enums: {
            appointment_status: "pending" | "confirmed" | "completed" | "cancelled" | "rejected"
            gender_type: "male" | "female" | "other"
            user_role: "patient" | "doctor" | "admin"
        }
    }
}
