-- Migration to update subscription plans to strict user requirements
-- Values:
-- Basic: 500 FCFA, 1 loan, 10,000 FCFA limit, 7 days
-- Silver: 1000 FCFA, 2 loans, 25,000 FCFA limit, 10 days
-- Gold: 1500 FCFA, 3 loans, 50,000 FCFA limit, 15 days
-- Platinum: 3000 FCFA, 5 loans, 100,000 FCFA limit, 20 days

-- Update Basic
UPDATE public.abonnements 
SET price = 500, max_loans_per_month = 1, max_loan_amount = 10000, repayment_delay_days = 7
WHERE name = 'Basic';

-- Update Silver
UPDATE public.abonnements 
SET price = 1000, max_loans_per_month = 2, max_loan_amount = 25000, repayment_delay_days = 10
WHERE name = 'Silver';

-- Update Gold
UPDATE public.abonnements 
SET price = 1500, max_loans_per_month = 3, max_loan_amount = 50000, repayment_delay_days = 15
WHERE name = 'Gold';

-- Update Platinum
UPDATE public.abonnements 
SET price = 3000, max_loans_per_month = 5, max_loan_amount = 100000, repayment_delay_days = 20
WHERE name = 'Platinum';
