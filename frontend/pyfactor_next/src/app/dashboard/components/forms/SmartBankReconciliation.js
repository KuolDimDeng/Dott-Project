'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  ArrowsRightLeftIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

// Fuzzy matching algorithm for transaction matching
const calculateSimilarity = (str1, str2) => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Calculate Levenshtein distance
  const matrix = [];
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
};

// Smart matching algorithm
const findPotentialMatches = (bankTransaction, bookTransactions, options = {}) => {
  const {
    dateToleranceDays = 3,
    amountTolerancePercent = 0.05,
    minSimilarityScore = 0.6
  } = options;
  
  const matches = [];
  const bankDate = new Date(bankTransaction.date);
  const bankAmount = Math.abs(bankTransaction.amount);
  
  for (const bookTx of bookTransactions) {
    if (bookTx.matched) continue; // Skip already matched transactions
    
    const bookDate = new Date(bookTx.date);
    const bookAmount = Math.abs(bookTx.amount);
    
    // Date check
    const daysDiff = Math.abs((bankDate - bookDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > dateToleranceDays) continue;
    
    // Amount check
    const amountDiff = Math.abs(bankAmount - bookAmount);
    const amountPercent = amountDiff / bankAmount;
    if (amountPercent > amountTolerancePercent) continue;
    
    // Description similarity
    const similarity = calculateSimilarity(
      bankTransaction.description,
      bookTx.description
    );
    
    if (similarity >= minSimilarityScore) {
      matches.push({
        bookTransaction: bookTx,
        score: {
          overall: (1 - daysDiff / dateToleranceDays) * 0.3 +
                  (1 - amountPercent) * 0.4 +
                  similarity * 0.3,
          dateDiff: daysDiff,
          amountDiff: amountDiff,
          similarity: similarity
        }
      });
    }
  }
  
  // Sort by overall score
  return matches.sort((a, b) => b.score.overall - a.score.overall);
};

const SmartBankReconciliation = ({ 
  bankTransactions = [], 
  bookTransactions = [],
  onReconciliationComplete
}) => {
  const [matches, setMatches] = useState([]);
  const [autoMatchedCount, setAutoMatchedCount] = useState(0);
  const [manualReviewCount, setManualReviewCount] = useState(0);
  const [unmatchedBankCount, setUnmatchedBankCount] = useState(0);
  const [unmatchedBookCount, setUnmatchedBookCount] = useState(0);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [reconciliationStatus, setReconciliationStatus] = useState('pending');
  const [showSettings, setShowSettings] = useState(false);
  
  // Matching settings
  const [settings, setSettings] = useState({
    dateToleranceDays: 3,
    amountTolerancePercent: 5,
    autoMatchThreshold: 95,
    enableDuplicateDetection: true
  });
  
  // Run matching algorithm
  useEffect(() => {
    if (bankTransactions.length === 0 || bookTransactions.length === 0) return;
    
    performMatching();
  }, [bankTransactions, bookTransactions, settings]);
  
  const performMatching = () => {
    const allMatches = [];
    const bookTxCopy = bookTransactions.map(tx => ({ ...tx, matched: false }));
    
    // First pass: Find matches for each bank transaction
    for (const bankTx of bankTransactions) {
      const potentialMatches = findPotentialMatches(bankTx, bookTxCopy, {
        dateToleranceDays: settings.dateToleranceDays,
        amountTolerancePercent: settings.amountTolerancePercent / 100,
        minSimilarityScore: 0.5
      });
      
      if (potentialMatches.length > 0) {
        const bestMatch = potentialMatches[0];
        const isAutoMatch = bestMatch.score.overall * 100 >= settings.autoMatchThreshold;
        
        allMatches.push({
          id: `match-${bankTx.id}`,
          bankTransaction: bankTx,
          bookTransaction: bestMatch.bookTransaction,
          score: bestMatch.score,
          status: isAutoMatch ? 'auto' : 'review',
          confidence: Math.round(bestMatch.score.overall * 100)
        });
        
        // Mark book transaction as matched
        bestMatch.bookTransaction.matched = true;
      } else {
        // No match found
        allMatches.push({
          id: `unmatched-${bankTx.id}`,
          bankTransaction: bankTx,
          bookTransaction: null,
          score: null,
          status: 'unmatched',
          confidence: 0
        });
      }
    }
    
    // Count statistics
    const autoMatched = allMatches.filter(m => m.status === 'auto').length;
    const needsReview = allMatches.filter(m => m.status === 'review').length;
    const unmatched = allMatches.filter(m => m.status === 'unmatched').length;
    const unmatchedBooks = bookTxCopy.filter(tx => !tx.matched).length;
    
    setAutoMatchedCount(autoMatched);
    setManualReviewCount(needsReview);
    setUnmatchedBankCount(unmatched);
    setUnmatchedBookCount(unmatchedBooks);
    setMatches(allMatches);
  };
  
  const handleMatchApproval = (matchId, approved) => {
    setMatches(matches.map(match => {
      if (match.id === matchId) {
        return {
          ...match,
          status: approved ? 'approved' : 'rejected',
          reviewedAt: new Date()
        };
      }
      return match;
    }));
  };
  
  const handleManualMatch = (bankTxId, bookTxId) => {
    const bankTx = bankTransactions.find(tx => tx.id === bankTxId);
    const bookTx = bookTransactions.find(tx => tx.id === bookTxId);
    
    if (bankTx && bookTx) {
      setMatches(matches.map(match => {
        if (match.bankTransaction.id === bankTxId) {
          return {
            ...match,
            bookTransaction: bookTx,
            status: 'manual',
            confidence: 100,
            reviewedAt: new Date()
          };
        }
        return match;
      }));
    }
  };
  
  const handleBulkApprove = () => {
    const reviewMatches = matches.filter(m => m.status === 'review');
    if (reviewMatches.length === 0) {
      toast.error('No matches to approve');
      return;
    }
    
    setMatches(matches.map(match => {
      if (match.status === 'review') {
        return { ...match, status: 'approved', reviewedAt: new Date() };
      }
      return match;
    }));
    
    toast.success(`Approved ${reviewMatches.length} matches`);
  };
  
  const handleFinalize = () => {
    const approvedMatches = matches.filter(m => 
      m.status === 'approved' || m.status === 'auto' || m.status === 'manual'
    );
    
    if (onReconciliationComplete) {
      onReconciliationComplete({
        matches: approvedMatches,
        unmatched: {
          bank: matches.filter(m => m.status === 'unmatched'),
          book: bookTransactions.filter(tx => !tx.matched)
        },
        summary: {
          totalBankTransactions: bankTransactions.length,
          totalBookTransactions: bookTransactions.length,
          matched: approvedMatches.length,
          unmatchedBank: unmatchedBankCount,
          unmatchedBook: unmatchedBookCount
        }
      });
    }
    
    setReconciliationStatus('completed');
    toast.success('Reconciliation completed successfully');
  };
  
  // Calculate reconciliation progress
  const totalItems = matches.length;
  const processedItems = matches.filter(m => 
    m.status !== 'review' && m.status !== 'unmatched'
  ).length;
  const progress = totalItems > 0 ? (processedItems / totalItems) * 100 : 0;
  
  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <ArrowsRightLeftIcon className="h-6 w-6 text-blue-600 mr-2" />
            Smart Bank Reconciliation
          </h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-1" />
              <span className="text-2xl font-bold text-green-600">{autoMatchedCount}</span>
            </div>
            <p className="text-sm text-gray-600">Auto-Matched</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <ClockIcon className="h-5 w-5 text-yellow-600 mr-1" />
              <span className="text-2xl font-bold text-yellow-600">{manualReviewCount}</span>
            </div>
            <p className="text-sm text-gray-600">Need Review</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-1" />
              <span className="text-2xl font-bold text-red-600">{unmatchedBankCount}</span>
            </div>
            <p className="text-sm text-gray-600">Unmatched Bank</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <DocumentDuplicateIcon className="h-5 w-5 text-gray-600 mr-1" />
              <span className="text-2xl font-bold text-gray-600">{unmatchedBookCount}</span>
            </div>
            <p className="text-sm text-gray-600">Unmatched Book</p>
          </div>
        </div>
      </div>
      
      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="font-medium mb-3">Matching Settings</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Date Tolerance (days)
              </label>
              <input
                type="number"
                value={settings.dateToleranceDays}
                onChange={(e) => setSettings({
                  ...settings,
                  dateToleranceDays: parseInt(e.target.value)
                })}
                className="w-full px-3 py-1 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Amount Tolerance (%)
              </label>
              <input
                type="number"
                value={settings.amountTolerancePercent}
                onChange={(e) => setSettings({
                  ...settings,
                  amountTolerancePercent: parseFloat(e.target.value)
                })}
                className="w-full px-3 py-1 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Auto-Match Threshold (%)
              </label>
              <input
                type="number"
                value={settings.autoMatchThreshold}
                onChange={(e) => setSettings({
                  ...settings,
                  autoMatchThreshold: parseInt(e.target.value)
                })}
                className="w-full px-3 py-1 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Actions Bar */}
      <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleBulkApprove}
            disabled={manualReviewCount === 0}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
              manualReviewCount > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <CheckCircleIcon className="h-4 w-4 mr-1" />
            Approve All Reviews ({manualReviewCount})
          </button>
          <button
            onClick={performMatching}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-100"
          >
            <ArrowsRightLeftIcon className="h-4 w-4 mr-1" />
            Re-run Matching
          </button>
        </div>
        <button
          onClick={handleFinalize}
          disabled={manualReviewCount > 0}
          className={`px-4 py-2 rounded-md font-medium ${
            manualReviewCount === 0
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Finalize Reconciliation
        </button>
      </div>
      
      {/* Matches List */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {matches.filter(m => m.status === 'review').map((match) => (
          <div key={match.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1 grid grid-cols-2 gap-4">
                {/* Bank Transaction */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Bank Transaction</h4>
                  <p className="text-sm text-gray-600">
                    {format(new Date(match.bankTransaction.date), 'MMM dd, yyyy')}
                  </p>
                  <p className="text-sm font-medium">{match.bankTransaction.description}</p>
                  <p className={`text-sm font-bold ${
                    match.bankTransaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${Math.abs(match.bankTransaction.amount).toFixed(2)}
                  </p>
                </div>
                
                {/* Matched Book Transaction */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    Suggested Match ({match.confidence}% confidence)
                  </h4>
                  {match.bookTransaction ? (
                    <>
                      <p className="text-sm text-gray-600">
                        {format(new Date(match.bookTransaction.date), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm font-medium">{match.bookTransaction.description}</p>
                      <p className={`text-sm font-bold ${
                        match.bookTransaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${Math.abs(match.bookTransaction.amount).toFixed(2)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No match found</p>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="ml-4 flex items-center space-x-2">
                <button
                  onClick={() => handleMatchApproval(match.id, true)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded"
                  title="Approve match"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => handleMatchApproval(match.id, false)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                  title="Reject match"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Match Details */}
            {match.score && (
              <div className="mt-2 text-xs text-gray-500">
                Date diff: {match.score.dateDiff} days | 
                Amount diff: ${match.score.amountDiff.toFixed(2)} | 
                Text similarity: {Math.round(match.score.similarity * 100)}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SmartBankReconciliation;