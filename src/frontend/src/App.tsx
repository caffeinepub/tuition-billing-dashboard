import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Banknote,
  BookOpen,
  ChevronRight,
  Clock,
  Loader2,
  Mail,
  Phone,
  Search,
  Smartphone,
  User,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Student } from "./backend.d";
import { PaymentMode } from "./backend.d";
import PaymentHistorySheet from "./components/PaymentHistorySheet";
import { useActor } from "./hooks/useActor";
import {
  SAMPLE_PLANS,
  useLocalPayments,
  useMakePayment,
  useSearchStudents,
} from "./hooks/useQueries";
import { formatAmount, formatDate } from "./utils/format";

const queryClient = new QueryClient();

const SKELETON_KEYS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"];

function BillingApp() {
  const { actor } = useActor();
  const seededRef = useRef(false);

  // Seed sample data once
  useEffect(() => {
    if (!actor || seededRef.current) return;
    const already = localStorage.getItem("sampleDataSeeded_v2");
    if (!already) {
      seededRef.current = true;
      actor.addSampleData().then(() => {
        localStorage.setItem("sampleDataSeeded_v2", "true");
        queryClient.invalidateQueries();
      });
    }
  }, [actor]);

  const plans = SAMPLE_PLANS;
  const trainingPlans = plans.filter((p) => p.category === "Training");
  const mealPlans = plans.filter((p) => p.category === "Meal Plan");

  const { data: allPayments = [], isLoading: paymentsLoading } =
    useLocalPayments();
  const makePayment = useMakePayment();

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((val: string) => {
    setSearchQuery(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(val);
      setShowDropdown(true);
    }, 300);
  }, []);

  const { data: searchResults = [] } = useSearchStudents(debouncedQuery);

  // Form state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.cash);
  const [notes, setNotes] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

  const selectedPlan = plans.find((p) => p.id.toString() === selectedPlanId);

  // Auto-fill amount when plan changes
  useEffect(() => {
    if (selectedPlan) {
      setAmountPaid(Number(selectedPlan.fee).toString());
    }
  }, [selectedPlan]);

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearchQuery("");
    setDebouncedQuery("");
    setShowDropdown(false);
  };

  const handleClearStudent = () => {
    setSelectedStudent(null);
    setSelectedPlanId("");
    setAmountPaid("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!selectedStudent || !selectedPlanId || !amountPaid) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      await makePayment.mutateAsync({
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        planId: selectedPlan!.id,
        planName: selectedPlan!.name,
        planAmount: selectedPlan!.fee,
        amountPaid: BigInt(Math.round(Number.parseFloat(amountPaid))),
        mode: paymentMode,
        notes: notes.trim(),
      });
      toast.success(`Payment recorded for ${selectedStudent.name}!`, {
        description: `${selectedPlan?.name} · ${formatAmount(BigInt(Math.round(Number.parseFloat(amountPaid))))} via ${
          paymentMode === PaymentMode.cash ? "Cash" : "UPI"
        }`,
      });
      handleClearStudent();
      setSelectedPlanId("");
      setAmountPaid("");
      setNotes("");
      setPaymentMode(PaymentMode.cash);
    } catch {
      toast.error("Failed to record payment. Please try again.");
    }
  };

  // Recent renewals: last 5 sorted by date
  const recentPayments = [...allPayments]
    .sort((a, b) => b.date - a.date)
    .slice(0, 5);

  const ocidItems = [
    "billing.recent_renewal.item.1",
    "billing.recent_renewal.item.2",
    "billing.recent_renewal.item.3",
    "billing.recent_renewal.item.4",
    "billing.recent_renewal.item.5",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              Tuition Billing
            </h1>
            <p className="text-xs text-muted-foreground">
              Subscription & Payment Management
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Renewals Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border card-glow overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="font-display font-semibold text-base">
                  Recent Renewals
                </h2>
                <Badge
                  variant="outline"
                  className="ml-auto text-xs border-border text-muted-foreground"
                >
                  Last 5
                </Badge>
              </div>

              <div
                data-ocid="billing.recent_renewals_list"
                className="divide-y divide-border"
              >
                {paymentsLoading ? (
                  <div
                    className="p-4 space-y-3"
                    data-ocid="billing.loading_state"
                  >
                    {SKELETON_KEYS.map((key) => (
                      <div key={key} className="flex gap-3">
                        <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3.5 w-3/4 rounded" />
                          <Skeleton className="h-3 w-1/2 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentPayments.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <p className="text-3xl mb-2">📑</p>
                    <p className="text-sm">No payments yet</p>
                    <p className="text-xs mt-1">
                      Record a payment to see it here
                    </p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {recentPayments.map((payment, index) => {
                      const initials = payment.studentName
                        ? payment.studentName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()
                        : "?";
                      return (
                        <motion.div
                          key={payment.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          data-ocid={ocidItems[index]}
                          className="px-4 py-3.5 hover:bg-accent/40 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-primary">
                                {initials}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {payment.studentName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {payment.planName}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-sm font-semibold text-primary">
                                  {formatAmount(payment.amountPaid)}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={
                                    payment.paymentMode === PaymentMode.cash
                                      ? "text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-400 bg-amber-500/10"
                                      : "text-[10px] px-1.5 py-0 border-blue-500/40 text-blue-400 bg-blue-500/10"
                                  }
                                >
                                  {payment.paymentMode === PaymentMode.cash
                                    ? "Cash"
                                    : "UPI"}
                                </Badge>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap pt-0.5">
                              {new Date(payment.date).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                },
                              )}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </aside>

          {/* Payment Form */}
          <section className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-card rounded-xl border border-border card-glow"
            >
              <div className="px-6 py-5 border-b border-border">
                <h2 className="font-display font-semibold text-lg">
                  Record Payment
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Search for a student and record their subscription payment
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Student Search */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Student *</Label>

                  {selectedStudent ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-4 p-4 rounded-xl border border-primary/25 amber-glow"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {selectedStudent.name}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {selectedStudent.phone}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            <span className="truncate">
                              {selectedStudent.email}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-primary/30 text-primary hover:bg-primary/10"
                          onClick={() => setHistoryOpen(true)}
                          data-ocid="billing.view_history_button"
                        >
                          History
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                        <button
                          type="button"
                          onClick={handleClearStudent}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="relative">
                      <div className="relative search-glow rounded-lg transition-all">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          data-ocid="billing.search_input"
                          placeholder="Search by name, phone, or email…"
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          onFocus={() => searchQuery && setShowDropdown(true)}
                          onBlur={() =>
                            setTimeout(() => setShowDropdown(false), 150)
                          }
                          className="pl-10 bg-input border-border focus-visible:ring-primary/50 text-sm h-11"
                        />
                      </div>

                      <AnimatePresence>
                        {showDropdown && debouncedQuery.trim() && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full mt-1 w-full z-50 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
                          >
                            {searchResults.length === 0 ? (
                              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                No students found for &ldquo;{debouncedQuery}
                                &rdquo;
                              </div>
                            ) : (
                              <ScrollArea className="max-h-56">
                                {searchResults.map((student) => (
                                  <button
                                    type="button"
                                    key={student.id.toString()}
                                    className="w-full text-left px-4 py-3 hover:bg-accent/60 transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
                                    onMouseDown={() =>
                                      handleSelectStudent(student)
                                    }
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                                      <span className="text-xs font-bold text-primary">
                                        {student.name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .slice(0, 2)
                                          .toUpperCase()}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">
                                        {student.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {student.phone} · {student.email}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </ScrollArea>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                <Separator className="bg-border" />

                {/* Plan Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Subscription Plan *
                    </Label>
                    <Select
                      value={selectedPlanId}
                      onValueChange={setSelectedPlanId}
                      disabled={!selectedStudent}
                    >
                      <SelectTrigger
                        data-ocid="billing.plan_select"
                        className="h-11 bg-input border-border focus:ring-primary/50 text-sm"
                      >
                        <SelectValue placeholder="Select a plan…" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectGroup>
                          <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                            Training Plans
                          </SelectLabel>
                          {trainingPlans.map((plan) => (
                            <SelectItem
                              key={plan.id.toString()}
                              value={plan.id.toString()}
                              className="focus:bg-accent"
                            >
                              <span className="font-medium">{plan.name}</span>
                              <span className="text-muted-foreground ml-2">
                                — {formatAmount(plan.fee)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <Separator className="my-1 bg-border" />
                        <SelectGroup>
                          <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                            Meal Plans
                          </SelectLabel>
                          {mealPlans.map((plan) => (
                            <SelectItem
                              key={plan.id.toString()}
                              value={plan.id.toString()}
                              className="focus:bg-accent"
                            >
                              <span className="font-medium">{plan.name}</span>
                              <span className="text-muted-foreground ml-2">
                                — {formatAmount(plan.fee)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Plan Fee</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-primary">
                        ₹
                      </span>
                      <Input
                        readOnly
                        value={
                          selectedPlan
                            ? Number(selectedPlan.fee).toLocaleString("en-IN")
                            : ""
                        }
                        placeholder="Auto-filled from plan"
                        className="pl-8 h-11 bg-muted/40 border-border text-sm cursor-default select-none text-muted-foreground"
                      />
                    </div>
                  </div>
                </div>

                {/* Amount + Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Amount Paid *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-primary">
                        ₹
                      </span>
                      <Input
                        data-ocid="billing.amount_input"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Enter amount…"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        disabled={!selectedStudent}
                        className="pl-8 h-11 bg-input border-border focus-visible:ring-primary/50 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Mode of Payment *
                    </Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        data-ocid="billing.cash_toggle"
                        onClick={() => setPaymentMode(PaymentMode.cash)}
                        disabled={!selectedStudent}
                        className={`flex-1 h-11 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                          paymentMode === PaymentMode.cash
                            ? "bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_0_1px_oklch(0.75_0.16_75_/_0.3)]"
                            : "bg-input border-border text-muted-foreground hover:bg-accent/60"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Banknote className="w-4 h-4" />
                        Cash
                      </button>
                      <button
                        type="button"
                        data-ocid="billing.upi_toggle"
                        onClick={() => setPaymentMode(PaymentMode.upi)}
                        disabled={!selectedStudent}
                        className={`flex-1 h-11 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                          paymentMode === PaymentMode.upi
                            ? "bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_0_1px_oklch(0.6_0.2_220_/_0.3)]"
                            : "bg-input border-border text-muted-foreground hover:bg-accent/60"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <Smartphone className="w-4 h-4" />
                        UPI
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Notes{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    data-ocid="billing.notes_input"
                    placeholder="Add any notes about this payment…"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={!selectedStudent}
                    rows={2}
                    className="bg-input border-border focus-visible:ring-primary/50 text-sm resize-none"
                  />
                </div>

                {/* Submit */}
                <div className="pt-1">
                  <Button
                    data-ocid="billing.submit_button"
                    size="lg"
                    className="w-full h-12 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-[0_4px_20px_oklch(0.75_0.16_75_/_0.25)] text-base"
                    onClick={handleSubmit}
                    disabled={
                      makePayment.isPending ||
                      !selectedStudent ||
                      !selectedPlanId ||
                      !amountPaid
                    }
                  >
                    {makePayment.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Recording Payment…
                      </>
                    ) : (
                      "Record Payment"
                    )}
                  </Button>

                  {makePayment.isSuccess && (
                    <p
                      data-ocid="billing.success_state"
                      className="text-center text-sm text-success mt-3 animate-fade-in"
                    >
                      ✓ Payment recorded successfully
                    </p>
                  )}
                  {makePayment.isError && (
                    <p
                      data-ocid="billing.error_state"
                      className="text-center text-sm text-destructive mt-3 animate-fade-in"
                    >
                      ✗ Failed to record payment. Please try again.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </div>
      </footer>

      <PaymentHistorySheet
        studentId={selectedStudent?.id ?? null}
        studentName={selectedStudent?.name ?? null}
        studentPhone={selectedStudent?.phone ?? null}
        studentEmail={selectedStudent?.email ?? null}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />

      <Toaster richColors position="top-right" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BillingApp />
    </QueryClientProvider>
  );
}
