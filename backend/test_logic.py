import unittest
from logic_billing import calculate_billing_periods
from logic_labor import calculate_weekly_overtime

class TestBillingLogic(unittest.TestCase):
    def test_land_20_days(self):
        # 2025-01-01 to 2025-01-20 is 20 days
        result = calculate_billing_periods('2025-01-01', '2025-01-20', 'Land')
        # 20 // 15 = 1, 20 % 15 = 5
        self.assertEqual(result['periods15Day'], 1)
        self.assertEqual(result['remainderDays'], 5)
        self.assertEqual(result['totalDays'], 20)

    def test_ship_35_days(self):
        # 35 days
        result = calculate_billing_periods('2025-01-01', '2025-02-04', 'Ship')
        # 35 // 15 = 2, 35 % 15 = 5
        self.assertEqual(result['periods15Day'], 2)
        self.assertEqual(result['remainderDays'], 5)
        self.assertEqual(result['totalDays'], 35)

class TestLaborLogic(unittest.TestCase):
    def test_weekly_overtime(self):
        entries = [
            {'date': '2025-01-06', 'hours': 10, 'categoryId': 'c1'}, # Mon
            {'date': '2025-01-07', 'hours': 10, 'categoryId': 'c1'},
            {'date': '2025-01-08', 'hours': 10, 'categoryId': 'c1'},
            {'date': '2025-01-09', 'hours': 10, 'categoryId': 'c1'},
            {'date': '2025-01-10', 'hours': 10, 'categoryId': 'c1'}, # Fri
        ] # Total 50
        
        categories = [
            {'id': 'c1', 'isOvertimeEligible': True}
        ]
        
        results = calculate_weekly_overtime(entries, categories)
        self.assertEqual(len(results), 1)
        res = results[0]
        
        self.assertEqual(res['totalHours'], 50)
        self.assertEqual(res['regularHours'], 40)
        self.assertEqual(res['overtimeHours'], 10)

if __name__ == '__main__':
    unittest.main()
