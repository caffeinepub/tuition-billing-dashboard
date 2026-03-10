import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Student {
    id: bigint;
    name: string;
    email: string;
    phone: string;
}
export interface Plan {
    id: bigint;
    name: string;
    fee: bigint;
}
export interface Payment {
    id: bigint;
    studentId: bigint;
    planId: bigint;
    planName: string;
    planAmount: bigint;
    amountPaid: bigint;
    paymentMode: PaymentMode;
    date: bigint;
    notes: string;
}
export enum PaymentMode {
    upi = "upi",
    bank = "bank",
    cash = "cash",
    cheque = "cheque"
}
export interface backendInterface {
    addSampleData(): Promise<void>;
    createPlan(name: string, fee: bigint): Promise<bigint>;
    getPlans(): Promise<Array<Plan>>;
    getStudents(): Promise<Array<Student>>;
    makePayment(studentId: bigint, planId: bigint, amountPaid: bigint, mode: PaymentMode, notes: string): Promise<bigint>;
    registerStudent(name: string, phone: string, email: string): Promise<bigint>;
    searchStudents(query: string): Promise<Array<Student>>;
    searchStudentsByEmail(email: string): Promise<Array<Student>>;
    searchStudentsByName(name: string): Promise<Array<Student>>;
    searchStudentsByPhone(phone: string): Promise<Array<Student>>;
    getPaymentsByStudent(studentId: bigint): Promise<Array<Payment>>;
    getAllPayments(): Promise<Array<Payment>>;
    seedPlans(): Promise<void>;
    seedStudents(): Promise<void>;
}
