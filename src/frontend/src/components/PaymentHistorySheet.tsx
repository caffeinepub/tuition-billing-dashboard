import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentMode } from "../backend.d";
import { usePaymentsByStudent } from "../hooks/useQueries";
import { formatAmount } from "../utils/format";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatMsDate(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

interface Props {
  studentId: bigint | null;
  studentName: string | null;
  studentPhone: string | null;
  studentEmail: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PaymentHistorySheet({
  studentId,
  studentName,
  studentPhone,
  studentEmail,
  open,
  onOpenChange,
}: Props) {
  const { data: payments = [] } = usePaymentsByStudent(studentId);

  const sorted = [...payments].sort((a, b) => b.date - a.date);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 flex flex-col bg-card"
        data-ocid="billing.history_sheet"
      >
        <SheetHeader className="px-6 py-5 border-b border-border">
          <SheetTitle className="font-display text-xl">
            Payment History
            {studentName && (
              <span className="text-primary ml-2">— {studentName}</span>
            )}
          </SheetTitle>
          {(studentPhone || studentEmail) && (
            <p className="text-sm text-muted-foreground">
              {studentPhone} · {studentEmail}
            </p>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-display text-lg">No payments yet</p>
              <p className="text-sm mt-1">
                Payments will appear here after recording
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Plan</TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Plan Fee
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Paid
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right">
                    Balance
                  </TableHead>
                  <TableHead className="text-muted-foreground">Mode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((payment) => {
                  const balance =
                    Number(payment.planAmount) - Number(payment.amountPaid);
                  return (
                    <TableRow key={payment.id} className="border-border">
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatMsDate(payment.date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.planName}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatAmount(payment.planAmount)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-primary">
                        {formatAmount(payment.amountPaid)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {balance > 0 ? (
                          <span className="text-destructive">
                            -{formatAmount(BigInt(balance))}
                          </span>
                        ) : (
                          <span className="text-success">Paid</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            payment.paymentMode === PaymentMode.cash
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                              : "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
                          }
                          variant="outline"
                        >
                          {payment.paymentMode === PaymentMode.cash
                            ? "💵 Cash"
                            : "📱 UPI"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
