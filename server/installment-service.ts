import { storage } from "./storage";
import { sendEmailNotification, notifyAdminViaWhatsApp } from "./notifications";
import type { Order } from "@shared/schema";

/**
 * Smart Installment Service
 * Handles unpredictable deductions, partial payments, and penalties.
 */
export class InstallmentService {
  private static instance: InstallmentService;
  private isRunning: boolean = false;

  private constructor() {}

  public static getInstance(): InstallmentService {
    if (!InstallmentService.instance) {
      InstallmentService.instance = new InstallmentService();
    }
    return InstallmentService.instance;
  }

  /**
   * Start the background worker
   */
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("🚀 Smart Installment Service Started");
    
    // Run once an hour to check for due payments
    setInterval(() => this.processInstallments(), 60 * 60 * 1000);
    // Also run immediately on start
    this.processInstallments();
  }

  private async processInstallments() {
    try {
      const activeOrders = await storage.getActiveInstallmentOrders();
      const today = new Date();
      const dayOfMonth = today.getDate();

      for (const order of activeOrders) {
        await this.handleOrderInstallment(order, today, dayOfMonth);
      }
    } catch (error) {
      console.error("Error in Installment Service:", error);
    }
  }

  private async handleOrderInstallment(order: Order, today: Date, dayOfMonth: number) {
    if (order.installmentsPaid >= 4) return; // Fully paid

    // Window logic: 20th of current month to 15th of next month
    // We'll simplify: If we are between 20th and 15th, and haven't paid this cycle.
    
    const lastPaid = order.lastInstallmentDate ? new Date(order.lastInstallmentDate) : null;
    const isWithinWindow = dayOfMonth >= 20 || dayOfMonth <= 15;
    
    // Check if we already successfully charged in this cycle (approx 20 days since last charge)
    const daysSinceLastCharge = lastPaid ? (today.getTime() - lastPaid.getTime()) / (1000 * 3600 * 24) : 999;
    
    if (isWithinWindow && daysSinceLastCharge > 20) {
      // UNPREDICTABLE LOGIC: 
      // 30% chance to attempt charge today if within window
      // Increases to 100% if today is the 15th (last day of window)
      const shouldAttemptToday = Math.random() < 0.3 || dayOfMonth === 15;

      if (shouldAttemptToday) {
        await this.attemptCharge(order);
      } else if (dayOfMonth === 19) {
        // Send reminder on the 19th before the window opens
        await this.sendReminder(order);
      }
    }

    // Default Penalty Logic: If today is 16th and we haven't charged for this cycle
    if (dayOfMonth === 16 && daysSinceLastCharge > 25 && !order.isDefaulted) {
      await this.applyPenalty(order);
    }
  }

  private async attemptCharge(order: Order) {
    if (!order.paystackAuthCode) {
      console.warn(`No auth code for installment order #${order.id}`);
      return;
    }

    const amountToCharge = parseFloat(order.installmentAmount || "0") + parseFloat(order.installmentDebt || "0");
    if (amountToCharge <= 0) return;

    console.log(`🤖 AI Attempting Unpredictable Deduction for Order #${order.id}: GH₵${amountToCharge}`);

    try {
      // 1. Attempt Full Charge
      const success = await this.chargeViaPaystack(order.paystackAuthCode, amountToCharge, order.buyerEmail || '');
      
      if (success) {
        await storage.updateOrder(order.id, {
          installmentsPaid: order.installmentsPaid + 1,
          lastInstallmentDate: new Date(),
          installmentDebt: "0",
          isDefaulted: false,
          nextInstallmentDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
        });
        await this.notifySuccess(order, amountToCharge);
      } else {
        // 2. AI PERSISTENCE: If full charge fails, attempt 50% partial deduction
        console.log(`⚠️ Full charge failed for #${order.id}. Attempting partial (50%) deduction...`);
        const partialAmount = amountToCharge / 2;
        const partialSuccess = await this.chargeViaPaystack(order.paystackAuthCode, partialAmount, order.buyerEmail || '');

        if (partialSuccess) {
          const remainingDebt = (amountToCharge - partialAmount).toString();
          await storage.updateOrder(order.id, {
            installmentDebt: remainingDebt,
            lastInstallmentDate: new Date(), // Count partial as "activity" to prevent immediate penalty
            nextInstallmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // Try again in 2 days
          });
          await this.notifyPartial(order, partialAmount, remainingDebt);
        } else {
           console.log(`❌ All charge attempts failed for #${order.id}`);
        }
      }
    } catch (error) {
      console.error(`Charge attempt error for #${order.id}:`, error);
    }
  }

  private async chargeViaPaystack(authCode: string, amount: number, email: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.paystack.co/transaction/charge_authorization', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          authorization_code: authCode,
          email: email,
          amount: Math.round(amount * 100)
        })
      });

      const data = await response.json();
      return data.status && data.data.status === 'success';
    } catch (error) {
      return false;
    }
  }

  private async applyPenalty(order: Order) {
    const penalty = parseFloat(order.installmentAmount || "0") * 0.05;
    const newDebt = (parseFloat(order.installmentDebt || "0") + penalty).toString();
    
    await storage.updateOrder(order.id, {
      isDefaulted: true,
      installmentDebt: newDebt,
      penaltyAmount: (parseFloat(order.penaltyAmount || "0") + penalty).toString()
    });

    const msg = `Installment Default: Order #${order.id}. 5% penalty (GH₵${penalty.toFixed(2)}) applied. Total Debt: GH₵${newDebt}`;
    await notifyAdminViaWhatsApp(msg);
    await sendEmailNotification(order.buyerEmail || '', "Installment Default Notice", `
      <div style="color: red; font-family: sans-serif;">
        <h2>Urgent: Installment Default</h2>
        <p>Your installment payment for Order #${order.id} was unsuccessful within the window (20th - 15th).</p>
        <p>A 5% late penalty of <strong>GH₵${penalty.toFixed(2)}</strong> has been added to your balance.</p>
        <p>Please top up your account to avoid further penalties.</p>
      </div>
    `);
  }

  private async sendReminder(order: Order) {
    await sendEmailNotification(order.buyerEmail || '', "Installment Payment Reminder", `
      <div style="font-family: sans-serif;">
        <h3>Upcoming Installment Deduction</h3>
        <p>Your monthly installment for Order #${order.id} (GH₵${order.installmentAmount}) is due soon.</p>
        <p><strong>Note:</strong> Deductions occur unpredictably between the 20th and 15th. Please ensure your account is funded.</p>
        <p>Failure to pay by the 15th results in a <strong>5% penalty</strong>.</p>
      </div>
    `);
  }

  private async notifySuccess(order: Order, amount: number) {
    await sendEmailNotification(order.buyerEmail || '', "Installment Successful", `
      <p>Your installment of GH₵${amount.toFixed(2)} for Order #${order.id} was successfully processed. Thank you!</p>
    `);
  }

  private async notifyPartial(order: Order, amount: number, debt: string) {
    await sendEmailNotification(order.buyerEmail || '', "Partial Installment Processed", `
      <p>We processed a partial payment of GH₵${amount.toFixed(2)} for your installment (Order #${order.id}).</p>
      <p>Remaining balance for this month: <strong>GH₵${debt}</strong>. We will attempt to deduct the rest soon.</p>
    `);
  }
}

export const installmentService = InstallmentService.getInstance();
