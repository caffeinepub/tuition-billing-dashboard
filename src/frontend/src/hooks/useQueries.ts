import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Student } from "../backend.d";
import type { PaymentMode } from "../backend.d";
import { useActor } from "./useActor";

// Hardcoded sample plans (since backend has no getPlans endpoint)
export interface LocalPlan {
  id: bigint;
  name: string;
  fee: bigint;
  category?: string;
}

export const SAMPLE_PLANS: LocalPlan[] = [
  // ── Training Plans ──
  {
    id: 1n,
    name: "Male | 1 Time/Day - 30 Days",
    fee: 1300n,
    category: "Training",
  },
  {
    id: 2n,
    name: "Male | 2 Time/Day - 30 Days",
    fee: 2450n,
    category: "Training",
  },
  {
    id: 3n,
    name: "Female | 2 Time/Day - 30 Days",
    fee: 2100n,
    category: "Training",
  },
  {
    id: 4n,
    name: "Female | 1 Time/Day - 30 Days",
    fee: 1050n,
    category: "Training",
  },
  {
    id: 5n,
    name: "Male | 2 Time/Day - 15 Days",
    fee: 1300n,
    category: "Training",
  },
  {
    id: 6n,
    name: "Female | 2 Time/Day - 15 Days",
    fee: 1050n,
    category: "Training",
  },
  // ── Meal Plans ──
  {
    id: 7n,
    name: "Male | 1 Time/Day - 30 Days + Meal Plan",
    fee: 1300n,
    category: "Meal Plan",
  },
  {
    id: 8n,
    name: "Male | 2 Time/Day - 30 Days + Meal Plan",
    fee: 2450n,
    category: "Meal Plan",
  },
  {
    id: 9n,
    name: "Female | 2 Time/Day - 30 Days + Meal Plan",
    fee: 2100n,
    category: "Meal Plan",
  },
  {
    id: 10n,
    name: "Female | 1 Time/Day - 30 Days + Meal Plan",
    fee: 1050n,
    category: "Meal Plan",
  },
  {
    id: 11n,
    name: "Male | 2 Time/Day - 15 Days + Meal Plan",
    fee: 1300n,
    category: "Meal Plan",
  },
  {
    id: 12n,
    name: "Female | 2 Time/Day - 15 Days + Meal Plan",
    fee: 1050n,
    category: "Meal Plan",
  },
];

// Local payment record (stored in memory via React Query cache)
export interface LocalPayment {
  id: string;
  studentId: bigint;
  studentName: string;
  planId: bigint;
  planName: string;
  planAmount: bigint;
  amountPaid: bigint;
  paymentMode: PaymentMode;
  date: number; // ms timestamp
  notes: string;
}

// Load/save payments from localStorage
const PAYMENTS_KEY = "tuition_billing_payments";

export function loadLocalPayments(): LocalPayment[] {
  try {
    const raw = localStorage.getItem(PAYMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{
      id: string;
      studentId: string;
      studentName: string;
      planId: string;
      planName: string;
      planAmount: string;
      amountPaid: string;
      paymentMode: PaymentMode;
      date: number;
      notes: string;
    }>;
    return parsed.map((p) => ({
      ...p,
      studentId: BigInt(p.studentId),
      planId: BigInt(p.planId),
      planAmount: BigInt(p.planAmount),
      amountPaid: BigInt(p.amountPaid),
    }));
  } catch {
    return [];
  }
}

function saveLocalPayments(payments: LocalPayment[]) {
  localStorage.setItem(
    PAYMENTS_KEY,
    JSON.stringify(
      payments.map((p) => ({
        ...p,
        studentId: p.studentId.toString(),
        planId: p.planId.toString(),
        planAmount: p.planAmount.toString(),
        amountPaid: p.amountPaid.toString(),
      })),
    ),
  );
}

export function useLocalPayments() {
  return useQuery<LocalPayment[]>({
    queryKey: ["local-payments"],
    queryFn: () => loadLocalPayments(),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function usePaymentsByStudent(studentId: bigint | null) {
  return useQuery<LocalPayment[]>({
    queryKey: ["local-payments", studentId?.toString()],
    queryFn: () => {
      if (studentId === null) return [];
      return loadLocalPayments().filter((p) => p.studentId === studentId);
    },
    enabled: studentId !== null,
  });
}

export function useSearchStudents(query: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Student[]>({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!actor || !query.trim()) return [];
      const q = query.trim();
      // Search by name, email, and phone in parallel
      const [byName, byEmail, byPhone] = await Promise.all([
        actor.searchStudentsByName(q),
        actor.searchStudentsByEmail(q),
        actor.searchStudentsByPhone(q),
      ]);
      // Deduplicate by id
      const seen = new Set<string>();
      const combined: Student[] = [];
      for (const s of [...byName, ...byEmail, ...byPhone]) {
        const key = s.id.toString();
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(s);
        }
      }
      return combined;
    },
    enabled: !!actor && !isFetching && query.trim().length > 0,
  });
}

export function useMakePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      studentId: bigint;
      studentName: string;
      planId: bigint;
      planName: string;
      planAmount: bigint;
      amountPaid: bigint;
      mode: PaymentMode;
      notes: string;
    }) => {
      if (!actor) throw new Error("Actor not ready");
      // Call backend (no notes param in actual API)
      await actor.makePayment(
        params.studentId,
        params.planId,
        params.amountPaid,
        params.mode,
      );
      // Save locally
      const existing = loadLocalPayments();
      const newPayment: LocalPayment = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        studentId: params.studentId,
        studentName: params.studentName,
        planId: params.planId,
        planName: params.planName,
        planAmount: params.planAmount,
        amountPaid: params.amountPaid,
        paymentMode: params.mode,
        date: Date.now(),
        notes: params.notes,
      };
      saveLocalPayments([...existing, newPayment]);
      return newPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["local-payments"] });
    },
  });
}
