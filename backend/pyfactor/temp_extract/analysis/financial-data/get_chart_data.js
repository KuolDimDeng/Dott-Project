// pages/api/analysis/financial-data/get_chart_data.js
export default function handler(req, res) {
    const { x_axis, y_axis, time_granularity } = req.query;
    
    // Here you would normally fetch data from your database
    // For now, let's return some dummy data
    const dummyData = [
      { date: '2023-01', sales: 1000 },
      { date: '2023-02', sales: 1500 },
      { date: '2023-03', sales: 1200 },
      { date: '2023-04', sales: 1800 },
      { date: '2023-05', sales: 2000 },
      { date: '2023-06', sales: 2200 },
    ];
  
    res.status(200).json(dummyData);
  }