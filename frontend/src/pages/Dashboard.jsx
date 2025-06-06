import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid'
import { Download } from 'lucide-react';
import axios from 'axios';
import '../index.css'

// JSX component imports
import SummaryChart from '../assets/SummaryChart';
import NetIncomeChart from '../assets/NetIncomeChart';
import AvgWeeklyExpChart from '../assets/AvgWeeklyExpChart';
import TopExpensesList from '../assets/TopExpensesList';
import ChartDropdown from '../assets/ChartDropdown';
import WeeklyHeatmap from '../assets/WeeklyHeatmap';
import ExpensesPieChart from '../assets/ExpensesPieChart';

const API_URL = import.meta.env.VITE_API_URL;

function Dashboard() {
    const location = useLocation();
    const input_file = location.state?.file;

    const navigate = useNavigate();

    const [csvFile, setCsvFile] = useState(input_file);
    const [summary, setSummary] = useState(null);
    const [weeklyIncome, setWeeklyIncome] = useState(0.0);
    const [chartView, setChartView] = useState('summary') // 'summary', 'netIncome', or 'avgWeekly'
    const [topExpenses, setTopExpenses] = useState({});
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [cardColor, setCardColor] = useState('bg-white'); // 'bg-white' or 'bg-neutral-700'
    const [bgColor, setBgColor] = useState('bg-gray-100'); // 'bg-gray-100' or 'bg-neutral-900'
    const [cardTextColor, setCardTextColor] = useState('text-black'); // 'text-white' or 'text-black'
    const [categoryData, setCategoryData] = useState([]);

    const MAX_WEEKLY_INCOME = 5000
    const percentage = (weeklyIncome / MAX_WEEKLY_INCOME) * 100;

    useEffect(() => {
        const savedFileContent = localStorage.getItem('lastUploadedFileContent');
        const savedFileName = localStorage.getItem('lastUploadedFileName');
      
        if (savedFileContent && savedFileName) {
          // Convert back to a "File-like" object if needed (e.g., for parsing CSV again)
          const restoredFile = new File([savedFileContent], savedFileName, { type: 'text/csv' });
          setCsvFile(restoredFile);
        }
      }, []);
      

    const toggleAppearance = () => setIsDarkMode(prev => !prev)

    useEffect(() => {
        if (!isDarkMode) {
            setCardColor('bg-white')
            setBgColor('bg-gray-100')
            setCardTextColor('text-black')
        } else {
            setCardColor('bg-neutral-800')
            setBgColor('bg-neutral-900')
            setCardTextColor('text-white')
        }
    }, [isDarkMode])

    useEffect(() => {
        if (csvFile) {
            handleUpload()
          } else {
            // maybe redirect back to LandingPage or show a message
            console.log('No file received');
          }
    }, [csvFile]);

    const fetchTopExpenses = async () => {
        try {
            const res = await axios.get(`${API_URL}/top_expenses_by_month`);
            setTopExpenses(res.data);
        } catch (err) {
            console.error("Failed to fetch top expenses", err);
        }
    };


    const handleUpload = async () => {
        if (!csvFile) return;
        const formData = new FormData();
        formData.append("file", csvFile); // wrap csv file in a form object to send via HTTP
        
        localStorage.setItem('lastUploadedFileName', csvFile.name);
        const reader = new FileReader();
        reader.onload = () => {
            localStorage.setItem('lastUploadedFileContent', reader.result); // base64 or raw text
        };
        reader.readAsText(csvFile);

        try {
            const response = await axios.post(`${API_URL}/upload`, formData, {
                headers: {"Content-Type": "multipart/form-data"},
            });
            setSummary(response.data);
            fetchTopExpenses();
            await getPieChartData()
            
        } catch (err) {
            alert("Error uploading file");
        }
    };

    const getPieChartData = async () => {
        try {
            const response = await axios.get(`${API_URL}/cleaned_expenses`);
            const categoryTotals = {};
            response.data.forEach(record => {
                if (record.Category && record.Amount > 0) {
                    categoryTotals[record.Category] = (categoryTotals[record.Category] || 0) + record.Amount;
                }
            });
    
            const pieData = Object.entries(categoryTotals).map(([category, total]) => ({
                name: category,
                value: parseFloat(total.toFixed(2)),
            }));
    
            setCategoryData(pieData);
        } catch {
            alert("Error obtaining pie chart data");
        }
    }

    const handleDownload = async () => {
        if (!csvFile) return;
        try {
            const response = await axios.get(`${API_URL}/download_cleaned_csv`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'cleaned_expenses.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert("Failed to download CSV.");
        }
    };

    return (
        <>
            <div className={`flex justify-between ${bgColor} p-4`}>
                <div 
                    className="flex bg-clip-text text-transparent items-center font-bold text-4xl ml-4 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}
                    onClick={() => navigate('/')}
                >Tracko</div>
                <div className='flex'>
                    <button 
                        className={`flex items-center gap-2 p-2 mx-2 text-xs rounded-md shadow-sm ${cardColor} hover:shadow-md hover:ring-1 hover:ring-white disabled:opacity-50
                                    ${isDarkMode ? 'text-white' : 'text-black'}`}
                        onClick={handleDownload}
                        disabled={!csvFile}
                        >
                        <Download className="w-4 h-4" />
                        Export Expense Data
                    </button>
                    <button
                        onClick={toggleAppearance}
                        className={`w-10 h-10 flex items-center justify-center rounded-md shadow-sm ${cardColor}
                                    transition-colors duration-300 hover:shadow-md hover:ring-1 hover:ring-white`}
                    >
                    {isDarkMode ? (
                        <MoonIcon className="w-6 h-6 text-white" />
                    ) : (
                        <SunIcon className="w-6 h-6 text-black" />
                    )}
                    </button>
                </div>
                
            </div>
            <div className={`flex min-h-screen ${bgColor} ${cardTextColor} p-4 transition-colors duration-300 pd-8`}>  
                <div className="flex mx-auto grid grid-rows-2 gap-6">
                    {/* Row 1 */}
                    <div className="grid grid-cols-5 gap-4">
                        {/* Monthly expenses card */}
                        <div className={`col-span-1 ${cardColor} rounded-lg p-6 shadow-md flex flex-col`}>
                            <h2 className="text-sm font-medium">Monthly Expenditure</h2>
                            <div className="max-h-[30rem] flex flex-col gap-4 overflow-y-auto mt-2"> 
                                {summary?.monthly && Object.entries(summary.monthly).map(([month, amount], index, arr) => {
                                    const prevAmount = arr[index + 1]?.[1] || amount; // Previous month's amount or current if it's the first month
                                    const isIncrease = amount > prevAmount;
                                    const isDecrease = amount < prevAmount;
                                    const percentage = prevAmount !== 0 ? ((amount - prevAmount) / prevAmount) * 100 : 0;
                                    const formattedPercentage = Math.abs(percentage).toFixed(1);
                                    return (
                                        <div
                                            key={month}
                                            className={`flex flex-col bg-white-100 px-4 py-3 rounded shadow-md text-xs`}
                                        >
                                            <div className="font-light">{month}</div>
                                            <div className={`flex justify-between text-lg ${isDarkMode ? 'text-white': 'text-[#4f3af4]'} font-medium`}>
                                                <div>
                                                    ${amount.toFixed(2)}
                                                </div>
                                                <div className='flex items-center'>
                                                    {(isIncrease || isDecrease) && (
                                                        <span
                                                            className={`flex items-center px-2 py-0.5 rounded-full text-xs font-medium 
                                                                ${isIncrease
                                                                    ? isDarkMode
                                                                        ? 'bg-red-800 bg-opacity-20 text-red-400'
                                                                        : 'bg-red-100 text-red-700'
                                                                    : isDarkMode
                                                                        ? 'bg-green-800 bg-opacity-20 text-green-400'
                                                                        : 'bg-green-100 text-green-700'}`}
                                                        >
                                                            {isIncrease ? '↑' : '↓'} {formattedPercentage}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        
                        {/* Large chart card */}
                        <div className={`col-span-3 ${cardColor} rounded-lg p-6 shadow-md`}>
                            <h2 className="text-sm font-medium">Big Chart</h2>
                                <div className={`flex justify-end my-4 ${cardTextColor}`}>
                                    <ChartDropdown
                                        chartView={chartView}
                                        setChartView={setChartView}
                                        isDarkMode={isDarkMode}
                                    />
                                </div>
                                {chartView === 'summary' && summary?.monthly && summary?.weekly && (
                                    <SummaryChart 
                                        monthly={summary.monthly}
                                        weekly={summary.weekly}
                                        weeklyIncome={weeklyIncome}
                                        darkMode={isDarkMode}
                                    />
                                )}
                                {chartView === 'netIncome' && summary?.weekly && (
                                    <NetIncomeChart 
                                        weekly={summary.weekly }
                                        weeklyIncome={weeklyIncome}
                                        darkMode={isDarkMode}
                                    />
                                )}
                                {chartView === 'avgWeekly' && summary?.weekly && (
                                    <AvgWeeklyExpChart 
                                        weekly={summary.weekly}
                                        labels={Object.keys(summary.weekly)}
                                        darkMode={isDarkMode}
                                    />
                                )}
                        </div>

                        {/* Stack of smaller cards */}
                        <div className="col-span-1 grid grid-rows-2 gap-4">
                            <div className={`flex flex-col justify-between ${cardColor} rounded-lg p-4 shadow-md`}>
                                <h3 className="text-sm font-medium">Weekly Income</h3>
                                <p className={`text-xs mb-4 ${isDarkMode ? 'text-white' : 'text-gray-500'}`}>
                                    Adjust your weekly income using the slider below:
                                </p>

                                {/* Income Display */}
                                <div
                                    className={`text-5xl font-semibold mb-3 ${
                                    weeklyIncome > 0 ? isDarkMode ? 'text-[#e3f0fd]' :'text-blue-600' : 'text-gray-500'
                                    }`}
                                >
                                    ${weeklyIncome.toLocaleString()}
                                </div>

                                {/* Slider */}
                                <input
                                    type="range"
                                    min="0"
                                    max={MAX_WEEKLY_INCOME}
                                    step="50"
                                    value={weeklyIncome}
                                    onChange={(e) => setWeeklyIncome(Number(e.target.value))}
                                    style={{
                                        background: `linear-gradient(to right, #3B82F6 ${percentage}%, #E5E7EB ${percentage}%)`
                                    }}
                                    className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer 
                                                [&::-webkit-slider-thumb]:appearance-none
                                                [&::-webkit-slider-thumb]:w-4
                                                [&::-webkit-slider-thumb]:h-4
                                                [&::-webkit-slider-thumb]:bg-white
                                                [&::-webkit-slider-thumb]:rounded-md
                                                [&::-webkit-slider-thumb]:border
                                                [&::-webkit-slider-thumb]:border-blue-400
                                                [&::-webkit-slider-thumb]:shadow
                                                [&::-webkit-slider-thumb]:cursor-pointer
                                    "
                                />
                                <input
                                    type="number"
                                    // value={weeklyIncome}
                                    onChange={(e) => setWeeklyIncome(Math.max(0, Number(e.target.value)))}
                                    value={weeklyIncome == 0 ? "" : weeklyIncome}
                                    className={`w-full px-3 py-2 mt-8 border rounded shadow-md focus:outline-none focus:ring ${isDarkMode ? 'bg-neutral-800' : 'bg-white'}`}
                                    placeholder="Enter amount"
                                />
                            </div>
                            <div
                                className={`flex flex-col ${cardColor} rounded-lg p-4 shadow-md`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                e.preventDefault();
                                const file = e.dataTransfer.files[0];
                                if (file && file.name.endsWith('.csv')) {
                                    setCsvFile(file);
                                }
                                }}
                            >
                                <h3 className="text-sm font-medium">Visualise another dataset</h3>
                                <p className="text-xs text-gray-500 mb-3 mt-2">Drop a CSV file below or click to upload</p>

                                <label
                                    htmlFor="csvUpload"
                                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-sm cursor-pointer transition hover:bg-blue-50 ${
                                        isDarkMode ? 'border-gray-600 text-white hover:bg-neutral-700' : 'border-gray-300 text-gray-600'
                                    }`}
                                >
                                <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Click to upload .csv</span>
                                <input
                                    id="csvUpload"
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file && file.name.endsWith('.csv')) {
                                        setCsvFile(file);
                                    }
                                    }}
                                />
                                </label>
                                {csvFile && (
                                    <p className="mt-3 text-xs italic text-gray-500 truncate" title={csvFile.name}>
                                    Uploaded file: <span className="font-medium">{csvFile.name}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Row 2 */}
                    <div className="max-h-[35rem] grid grid-cols-3 gap-4">
                        <div className={`${cardColor} rounded-lg p-4 shadow-md overflow-y-auto`}>
                            <h3 className="text-sm font-medium">Highest Transactions</h3>
                            <TopExpensesList data={topExpenses} darkMode={isDarkMode}/>
                        </div>
                        <div className={`flex flex-col ${cardColor} rounded-lg p-4 shadow-md overflow-y-auto`}>
                            <h3 className="text-sm font-medium">Weekly breakdown</h3>
                            <WeeklyHeatmap weekly={summary?.weekly} darkMode={isDarkMode}/>
                        </div>
                        <div className={`flex flex-col ${cardColor} rounded-lg p-4 shadow-md`}>
                            <h3 className="text-sm font-medium">Expenditure by Category</h3>
                            <ExpensesPieChart data={categoryData} />
                        </div>
                    </div>
                </div>
            </div>        
        </>
    );
}

export default Dashboard
