import React, { useState, useEffect } from 'react';
import { Trash2, ArrowDown } from 'lucide-react';

// 主要應用組件
const AIOutputComparer = () => {
	const [files, setFiles] = useState([]);
	const [baseFileIndex, setBaseFileIndex] = useState(null);
	const [diffs, setDiffs] = useState({});
	const [expandedDiffs, setExpandedDiffs] = useState({});

	// 處理文件上傳
	const handleFileUpload = async (e) => {
		const uploadedFiles = Array.from(e.target.files);

		if (uploadedFiles.length === 0) return;

		const newFiles = [];

		for (const file of uploadedFiles) {
			try {
				const text = await readFileAsText(file);
				newFiles.push({
					name: file.name,
					content: text,
					uploadTime: new Date().toLocaleTimeString()
				});
			} catch (error) {
				console.error(`無法讀取文件 ${file.name}:`, error);
			}
		}

		setFiles(prev => [...prev, ...newFiles]);

		// 如果尚未設定基準文件，則將第一個上傳的文件設為基準
		if (baseFileIndex === null && newFiles.length > 0) {
			setBaseFileIndex(files.length);
		}
	};

	// 將文件讀取為文本
	const readFileAsText = (file) => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (e) => resolve(e.target.result);
			reader.onerror = (e) => reject(e);
			reader.readAsText(file);
		});
	};

	// 設定基準文件
	const setAsBaseFile = (index) => {
		setBaseFileIndex(index);
	};

	// 刪除文件
	const removeFile = (index) => {
		const newFiles = [...files];
		newFiles.splice(index, 1);
		setFiles(newFiles);

		// 如果刪除的是基準文件，則重置基準文件索引
		if (index === baseFileIndex) {
			setBaseFileIndex(newFiles.length > 0 ? 0 : null);
		} else if (index < baseFileIndex) {
			// 如果刪除的文件在基準文件之前，則需要調整基準文件索引
			setBaseFileIndex(baseFileIndex - 1);
		}
	};

	// 計算差異
	useEffect(() => {
		if (baseFileIndex === null || files.length <= 1) {
			setDiffs({});
			return;
		}

		const baseContent = files[baseFileIndex].content;
		const newDiffs = {};

		files.forEach((file, index) => {
			if (index !== baseFileIndex) {
				const diffResult = computeDiff(baseContent, file.content);
				newDiffs[index] = diffResult;
			}
		});

		setDiffs(newDiffs);
	}, [files, baseFileIndex]);

	// 切換展開/折疊差異詳情
	const toggleDiffExpansion = (index) => {
		setExpandedDiffs(prev => ({
			...prev,
			[index]: !prev[index]
		}));
	};

	// 計算兩個文本的差異
	const computeDiff = (text1, text2) => {
		const lines1 = text1.split('\n');
		const lines2 = text2.split('\n');
		const result = [];
		let changes = 0;

		// 使用基本的行級比較
		const maxLen = Math.max(lines1.length, lines2.length);

		for (let i = 0; i < maxLen; i++) {
			const line1 = i < lines1.length ? lines1[i] : null;
			const line2 = i < lines2.length ? lines2[i] : null;

			if (line1 === null) {
				// 新增的行
				result.push({ type: 'added', content: line2, lineNumber: i + 1 });
				changes++;
			} else if (line2 === null) {
				// 刪除的行
				result.push({ type: 'removed', content: line1, lineNumber: i + 1 });
				changes++;
			} else if (line1 !== line2) {
				// 修改的行
				result.push({
					type: 'modified',
					old: line1,
					new: line2,
					lineNumber: i + 1,
					wordDiff: computeWordDiff(line1, line2)
				});
				changes++;
			} else {
				// 相同的行
				result.push({ type: 'unchanged', content: line1, lineNumber: i + 1 });
			}
		}

		return {
			diff: result,
			changeCount: changes,
			summary: `${changes} 處差異`
		};
	};

	// 計算單詞級別的差異 (簡化版)
	const computeWordDiff = (text1, text2) => {
		const words1 = text1.split(/\s+/);
		const words2 = text2.split(/\s+/);
		const result = [];

		// 使用簡單的單詞級比較
		const lcs = longestCommonSubsequence(words1, words2);
		let pos1 = 0, pos2 = 0;

		for (const commonWord of lcs) {
			// 添加在共同單詞之前的刪除單詞
			while (pos1 < words1.length && words1[pos1] !== commonWord) {
				result.push({ type: 'removed', word: words1[pos1] });
				pos1++;
			}

			// 添加在共同單詞之前的新增單詞
			while (pos2 < words2.length && words2[pos2] !== commonWord) {
				result.push({ type: 'added', word: words2[pos2] });
				pos2++;
			}

			// 添加共同單詞
			result.push({ type: 'unchanged', word: commonWord });
			pos1++;
			pos2++;
		}

		// 添加剩餘的刪除單詞
		while (pos1 < words1.length) {
			result.push({ type: 'removed', word: words1[pos1] });
			pos1++;
		}

		// 添加剩餘的新增單詞
		while (pos2 < words2.length) {
			result.push({ type: 'added', word: words2[pos2] });
			pos2++;
		}

		return result;
	};

	// 最長公共子序列算法
	const longestCommonSubsequence = (arr1, arr2) => {
		const m = arr1.length;
		const n = arr2.length;
		const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));

		// 構建 dp 表格
		for (let i = 1; i <= m; i++) {
			for (let j = 1; j <= n; j++) {
				if (arr1[i - 1] === arr2[j - 1]) {
					dp[i][j] = dp[i - 1][j - 1] + 1;
				} else {
					dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
				}
			}
		}

		// 重建最長公共子序列
		const result = [];
		let i = m, j = n;

		while (i > 0 && j > 0) {
			if (arr1[i - 1] === arr2[j - 1]) {
				result.unshift(arr1[i - 1]);
				i--;
				j--;
			} else if (dp[i - 1][j] > dp[i][j - 1]) {
				i--;
			} else {
				j--;
			}
		}

		return result;
	};

	return (
		<div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 p-4">
		<header className="mb-6">
		<h1 className="text-2xl font-bold text-center">AI 模型輸出比較工具</h1>
		<p className="text-center text-gray-600">上傳多個文件，選擇一個作為基準，查看差異</p>
		</header>

		<div className="file-upload-section mb-6">
		<label className="block mb-2 font-medium">上傳文件</label>
		<input
		type="file"
		multiple
		onChange={handleFileUpload}
		className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2.5"
		/>
		</div>

		{files.length > 0 && (
			<div className="files-section bg-white rounded-lg shadow p-4 mb-6">
			<h2 className="text-xl font-semibold mb-4">已上傳文件</h2>
			<ul className="space-y-2">
			{files.map((file, index) => (
				<li key={index} className="border rounded-lg p-3 flex justify-between items-center">
				<div className="file-info">
				<div className="font-medium">
				{file.name}
				{index === baseFileIndex && (
					<span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">基準文件</span>
				)}
				</div>
				<div className="text-xs text-gray-500">上傳時間: {file.uploadTime}</div>
				</div>
				<div className="flex space-x-2">
				{index !== baseFileIndex && (
					<button
					onClick={() => setAsBaseFile(index)}
					className="text-blue-600 hover:text-blue-800 text-sm border border-blue-600 hover:bg-blue-50 rounded px-2 py-1"
					>
					設為基準
					</button>
				)}
				<button
				onClick={() => removeFile(index)}
				className="text-red-600 hover:text-red-800"
				aria-label="刪除文件"
				>
				<Trash2 size={18} />
				</button>
				</div>
				</li>
			))}
			</ul>
			</div>
		)}

		{baseFileIndex !== null && files.length > 1 && (
			<div className="diff-section bg-white rounded-lg shadow p-4">
			<h2 className="text-xl font-semibold mb-4">差異比較</h2>

			{Object.keys(diffs).length === 0 ? (
				<p className="text-gray-500">計算差異中...</p>
			) : (
				<ul className="space-y-4">
				{Object.entries(diffs).map(([fileIndex, diffResult]) => (
					<li key={fileIndex} className="border rounded-lg overflow-hidden">
					<div
					className="bg-gray-100 p-3 flex justify-between items-center cursor-pointer"
					onClick={() => toggleDiffExpansion(Number(fileIndex))}
					>
					<div>
					<span className="font-medium">{files[Number(fileIndex)].name}</span>
					<span className="ml-2 text-sm text-gray-600">({diffResult.summary})</span>
					</div>
					<ArrowDown
					size={18}
					className={`transition-transform ${expandedDiffs[Number(fileIndex)] ? 'rotate-180' : ''}`}
					/>
					</div>

					{expandedDiffs[Number(fileIndex)] && (
						<div className="p-3 overflow-x-auto">
						<pre className="text-sm font-mono whitespace-pre-wrap">
						{diffResult.diff.map((line, lineIdx) => {
							if (line.type === 'unchanged') {
								return (
									<div key={lineIdx} className="leading-relaxed py-0.5">
									<span className="text-gray-500 select-none w-8 inline-block">{line.lineNumber}</span>
									{line.content}
									</div>
								);
							} else if (line.type === 'added') {
								return (
									<div key={lineIdx} className="bg-green-50 leading-relaxed py-0.5">
									<span className="text-gray-500 select-none w-8 inline-block">{line.lineNumber}</span>
									<span className="text-green-600">+ {line.content}</span>
									</div>
								);
							} else if (line.type === 'removed') {
								return (
									<div key={lineIdx} className="bg-red-50 leading-relaxed py-0.5">
									<span className="text-gray-500 select-none w-8 inline-block">{line.lineNumber}</span>
									<span className="text-red-600">- {line.content}</span>
									</div>
								);
							} else if (line.type === 'modified') {
								return (
									<div key={lineIdx}>
									<div className="bg-red-50 leading-relaxed py-0.5">
									<span className="text-gray-500 select-none w-8 inline-block">{line.lineNumber}</span>
									<span className="text-red-600">- {line.old}</span>
									</div>
									<div className="bg-green-50 leading-relaxed py-0.5">
									<span className="text-gray-500 select-none w-8 inline-block">{line.lineNumber}</span>
									<span className="text-green-600">+ {line.new}</span>
									</div>
									<div className="bg-gray-100 py-1 px-8 word-diff">
									{line.wordDiff.map((word, wordIdx) => {
										if (word.type === 'unchanged') {
											return <span key={wordIdx}>{word.word} </span>;
										} else if (word.type === 'added') {
											return <span key={wordIdx} className="bg-green-200 text-green-800">{word.word} </span>;
										} else if (word.type === 'removed') {
											return <span key={wordIdx} className="bg-red-200 text-red-800 line-through">{word.word} </span>;
										}
										return null;
									})}
									</div>
									</div>
								);
							}
							return null;
						})}
						</pre>
						</div>
					)}
					</li>
				))}
				</ul>
			)}
			</div>
		)}
		</div>
	);
};

export default AIOutputComparer;
