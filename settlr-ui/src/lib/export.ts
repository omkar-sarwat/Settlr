/**
 * Export Utilities
 * 
 * Functions to export transaction data to CSV and PDF formats.
 */

import type { Transaction } from '@/types';
import { formatCurrency, formatDate } from './formatters';

/**
 * Exports transactions to CSV file
 */
export function exportToCSV(transactions: Transaction[], filename: string = 'transactions.csv') {
  // CSV headers
  const headers = [
    'Transaction ID',
    'Date',
    'From',
    'To',
    'Amount',
    'Currency',
    'Status',
    'Fraud Score',
    'Description',
  ];

  // Convert transactions to CSV rows
  const rows = transactions.map((txn) => [
    txn.id,
    formatDate(new Date(txn.createdAt)),
    txn.fromUserName || txn.fromAccountId,
    txn.toUserName || txn.toAccountId,
    (txn.amount / 100).toFixed(2),
    txn.currency,
    txn.status,
    txn.fraudScore?.toString() || 'N/A',
    txn.description || '',
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports transactions to PDF (basic implementation)
 * For production, consider using a library like jsPDF or pdfmake
 */
export function exportToPDF(transactions: Transaction[], filename: string = 'transactions.pdf') {
  // Create HTML table
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Transaction Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          h1 {
            color: #333;
            border-bottom: 2px solid #6366f1;
            padding-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          th {
            background-color: #6366f1;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .success { color: #10b981; font-weight: bold; }
          .failed { color: #ef4444; font-weight: bold; }
          .pending { color: #f59e0b; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Settlr Transaction Report</h1>
        <p>Generated on ${formatDate(new Date())}</p>
        <p>Total Transactions: ${transactions.length}</p>
        
        <table>
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Date</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Fraud Score</th>
            </tr>
          </thead>
          <tbody>
            ${transactions
              .map(
                (txn) => `
              <tr>
                <td>${txn.id}</td>
                <td>${formatDate(new Date(txn.createdAt))}</td>
                <td>${txn.fromUserName || txn.fromAccountId}</td>
                <td>${txn.toUserName || txn.toAccountId}</td>
                <td>${formatCurrency(txn.amount)}</td>
                <td class="${txn.status}">${txn.status}</td>
                <td>${txn.fraudScore || 'N/A'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;

  // Create blob and download
  const blob = new Blob([html], { type: 'text/html' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename.replace('.pdf', '.html'));
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
