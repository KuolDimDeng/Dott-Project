#!/usr/bin/env node

/**
 * Fix the FieldTooltip component that got broken
 */

const fs = require('fs');
const path = require('path');

const paymentComponentsDir = path.join(__dirname, '../src/app/dashboard/components/forms');

console.log('=== Fixing FieldTooltip Components ===\n');

const files = fs.readdirSync(paymentComponentsDir)
  .filter(file => file.endsWith('.js') && 
    (file.includes('Payment') || file.includes('Refund') || file.includes('Recurring')));

files.forEach(file => {
  const filePath = path.join(paymentComponentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('const FieldTooltip')) {
    console.log(`📄 Fixing ${file}...`);
    
    // Fix the broken FieldTooltip component
    content = content.replace(
      /const FieldTooltip = \({ text }\) => \{[\s\S]*?};/m,
      `const FieldTooltip = ({ text }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <div className="relative inline-block ml-1">
      <QuestionMarkCircleIcon 
        className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      />
      {isVisible && (
        <div className="absolute z-10 w-64 p-2 text-xs text-white bg-gray-900 rounded-md shadow-lg -top-2 left-6">
          <div className="relative">
            {text}
            <div className="absolute w-2 h-2 bg-gray-900 rotate-45 -left-1 top-2"></div>
          </div>
        </div>
      )}
    </div>
  );
};`
    );
    
    // Remove "No newline at end of file" comments
    content = content.replace(/ No newline at end of file/g, '');
    
    // Ensure file ends with newline
    if (!content.endsWith('\n')) {
      content += '\n';
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('  ✅ Fixed FieldTooltip component');
  }
});

console.log('\n✅ Done!');