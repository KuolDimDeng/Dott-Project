import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import PrintButton from '../components/PrintButton';

export const metadata = {
  title: 'Location Tracking Privacy Policy - Dott',
  description: 'Learn how Dott handles location data for timesheet tracking and employee privacy',
};

export default async function LocationTrackingPolicyPage() {
  // Read the markdown file
  const filePath = path.join(process.cwd(), 'public', 'legal', 'location-tracking-policy.md');
  const markdown = fs.readFileSync(filePath, 'utf8');
  
  // Convert markdown to HTML
  const content = marked(markdown);
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-8 sm:px-12 sm:py-10">
            <div 
              className="prose prose-blue max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
          
          <div className="bg-gray-50 px-6 py-4 sm:px-12">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                If you have questions about this policy, contact us at{' '}
                <a href="mailto:privacy@dottapps.com" className="text-blue-600 hover:text-blue-700">
                  privacy@dottapps.com
                </a>
              </p>
              <PrintButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}