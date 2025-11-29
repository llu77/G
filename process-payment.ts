interface Env {
  DB: D1Database;
}

interface PaymentRecord {
  payrollId: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  paymentMethod: 'bank_transfer' | 'cash' | 'check';
  paymentDate: string;
  status: 'completed' | 'failed' | 'pending';
  notes?: string;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { payrollIds, paymentMethod = 'bank_transfer', notes = '' } = await context.request.json();
    
    if (!Array.isArray(payrollIds) || payrollIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid payroll IDs' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = context.env.DB;
    const paymentDate = new Date().toISOString();
    const processedPayments: PaymentRecord[] = [];
    const failedPayments: any[] = [];

    // Process each payroll record
    for (const payrollId of payrollIds) {
      try {
        // Get payroll record
        const payrollRecord = await db.prepare(`
          SELECT pr.*, e.bank_account, e.email
          FROM payroll_records pr
          JOIN employees e ON pr.employee_id = e.id
          WHERE pr.id = ? AND pr.status = 'generated'
        `).bind(payrollId).first();

        if (!payrollRecord) {
          failedPayments.push({ payrollId, error: 'Payroll record not found or not in generated status' });
          continue;
        }

        // Create payment record
        const paymentId = crypto.randomUUID();
        const paymentRecord: PaymentRecord = {
          payrollId,
          employeeId: payrollRecord.employee_id,
          employeeName: payrollRecord.employee_name,
          amount: payrollRecord.net_salary,
          paymentMethod,
          paymentDate,
          status: 'completed',
          notes
        };

        // Insert payment record
        await db.prepare(`
          INSERT INTO payroll_payments 
          (id, payroll_id, employee_id, employee_name, amount, payment_method, payment_date, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          paymentId,
          payrollId,
          payrollRecord.employee_id,
          payrollRecord.employee_name,
          payrollRecord.net_salary,
          paymentMethod,
          paymentDate,
          'completed',
          notes
        ).run();

        // Update payroll record status to 'paid'
        await db.prepare(`
          UPDATE payroll_records 
          SET status = 'paid', paid_at = ?
          WHERE id = ?
        `).bind(paymentDate, payrollId).run();

        // Create transaction record for accounting
        await createTransactionRecord(db, {
          id: crypto.randomUUID(),
          type: 'salary_payment',
          amount: payrollRecord.net_salary,
          description: `Salary payment for ${payrollRecord.employee_name} - ${payrollRecord.month}/${payrollRecord.year}`,
          employeeId: payrollRecord.employee_id,
          payrollId,
          paymentId,
          branchId: payrollRecord.branch_id,
          createdAt: paymentDate
        });

        // Send notification email (if email service is configured)
        await sendPaymentNotification(payrollRecord.email, payrollRecord.employee_name, payrollRecord.net_salary);

        processedPayments.push(paymentRecord);

      } catch (error) {
        console.error(`Failed to process payment for payroll ${payrollId}:`, error);
        failedPayments.push({ payrollId, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processedCount: processedPayments.length,
        failedCount: failedPayments.length,
        processedPayments,
        failedPayments
      }), 
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Payment processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process payments' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

interface TransactionRecord {
  id: string;
  type: string;
  amount: number;
  description: string;
  employeeId: string;
  payrollId: string;
  paymentId: string;
  branchId: string;
  createdAt: string;
}

async function createTransactionRecord(db: D1Database, transaction: TransactionRecord) {
  await db.prepare(`
    INSERT INTO financial_transactions 
    (id, transaction_type, amount, description, employee_id, payroll_id, payment_id, branch_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    transaction.id,
    transaction.type,
    transaction.amount,
    transaction.description,
    transaction.employeeId,
    transaction.payrollId,
    transaction.paymentId,
    transaction.branchId,
    transaction.createdAt
  ).run();
}

async function sendPaymentNotification(email: string, employeeName: string, amount: number) {
  // This would integrate with an email service like SendGrid, Mailgun, etc.
  // For now, we'll log the notification
  console.log(`Payment notification sent to ${email}: Salary payment of ${amount} SAR for ${employeeName}`);
  
  // Example implementation with a hypothetical email service:
  /*
  try {
    await fetch('https://api.emailservice.com/send', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: 'Salary Payment Confirmation',
        html: `
          <html>
            <body>
              <h2>Salary Payment Confirmation</h2>
              <p>Dear ${employeeName},</p>
              <p>We are pleased to inform you that your salary payment has been processed successfully.</p>
              <p><strong>Payment Details:</strong></p>
              <ul>
                <li>Amount: ${amount} SAR</li>
                <li>Payment Date: ${new Date().toLocaleDateString()}</li>
                <li>Payment Method: Bank Transfer</li>
              </ul>
              <p>The amount will be credited to your bank account within 1-2 business days.</p>
              <p>If you have any questions, please contact the HR department.</p>
              <p>Best regards,<br>LMM Finance Team</p>
            </body>
          </html>
        `,
      }),
    });
  } catch (error) {
    console.error('Failed to send email notification:', error);
  }
  */
}