import React from 'react';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { 
  AcademicCapIcon,
  LightBulbIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

export default function TaxFilingSteps({ 
  filingSteps, 
  showSteps, 
  loadingSteps, 
  generateFilingSteps, 
  calculations 
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
          <AcademicCapIcon className="h-5 w-5 mr-2 text-gray-600" />
          Personalized Filing Guide
        </h2>
        {!showSteps && calculations.salesTax.calculated && (
          <button
            onClick={generateFilingSteps}
            disabled={loadingSteps}
            className="flex items-center text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loadingSteps ? (
              <>
                <StandardSpinner size="small" className="mr-2" />
                Generating...
              </>
            ) : (
              <>
                <LightBulbIcon className="h-4 w-4 mr-2" />
                Get Filing Steps
              </>
            )}
          </button>
        )}
      </div>
      
      {showSteps && filingSteps ? (
        <div className="space-y-6">
          {/* Overview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">{filingSteps.overview}</p>
          </div>
          
          {/* Preparation Checklist */}
          {filingSteps.preparation && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                <ClipboardDocumentListIcon className="h-5 w-5 mr-2 text-gray-600" />
                Preparation Checklist
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Documents Needed</h4>
                  <ul className="space-y-1">
                    {filingSteps.preparation.documents_needed?.map((doc, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start">
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Forms Required</h4>
                  <ul className="space-y-1">
                    {filingSteps.preparation.forms_required?.map((form, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start">
                        <DocumentTextIcon className="h-4 w-4 text-blue-500 mr-1 mt-0.5 flex-shrink-0" />
                        {form}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Information to Gather</h4>
                  <ul className="space-y-1">
                    {filingSteps.preparation.information_to_gather?.map((info, index) => (
                      <li key={index} className="text-sm text-gray-700 flex items-start">
                        <ClipboardDocumentListIcon className="h-4 w-4 text-purple-500 mr-1 mt-0.5 flex-shrink-0" />
                        {info}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* Step-by-Step Process */}
          {filingSteps.filing_steps && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Step-by-Step Filing Process</h3>
              <div className="space-y-4">
                {filingSteps.filing_steps.map((step) => (
                  <div key={step.step_number} className="border rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-medium text-sm">
                        {step.step_number}
                      </div>
                      <div className="ml-4 flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{step.title}</h4>
                        <p className="text-sm text-gray-700 mb-2">{step.description}</p>
                        
                        {step.tips && step.tips.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-green-700 mb-1">💡 Tips:</p>
                            <ul className="space-y-0.5">
                              {step.tips.map((tip, index) => (
                                <li key={index} className="text-xs text-green-600">• {tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {step.warnings && step.warnings.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-red-700 mb-1">⚠️ Warnings:</p>
                            <ul className="space-y-0.5">
                              {step.warnings.map((warning, index) => (
                                <li key={index} className="text-xs text-red-600">• {warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {step.estimated_time && (
                          <p className="text-xs text-gray-500">
                            <ClockIcon className="inline h-3 w-3 mr-1" />
                            Estimated time: {step.estimated_time}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Common Mistakes */}
          {filingSteps.common_mistakes && filingSteps.common_mistakes.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Common Mistakes to Avoid</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filingSteps.common_mistakes.map((mistake, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-900 mb-1">❌ {mistake.mistake}</p>
                    <p className="text-xs text-red-700">✓ {mistake.how_to_avoid}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Location-Specific Information */}
          {filingSteps.location_specific && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-medium text-purple-900 mb-3">
                Location-Specific Information for {filingSteps.location}
              </h3>
              
              {filingSteps.location_specific.requirements && filingSteps.location_specific.requirements.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-purple-800 mb-1">Special Requirements</h4>
                  <ul className="space-y-1">
                    {filingSteps.location_specific.requirements.map((req, index) => (
                      <li key={index} className="text-sm text-purple-700">• {req}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {filingSteps.location_specific.benefits && filingSteps.location_specific.benefits.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-purple-800 mb-1">Available Benefits</h4>
                  <ul className="space-y-1">
                    {filingSteps.location_specific.benefits.map((benefit, index) => (
                      <li key={index} className="text-sm text-purple-700">• {benefit}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Professional Help */}
          {filingSteps.professional_help && (
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">When to Seek Professional Help</h3>
              <p className="text-sm text-gray-700 mb-2">{filingSteps.professional_help.when_needed}</p>
              <p className="text-sm text-gray-600">
                Consider consulting: {filingSteps.professional_help.types?.join(', ')}
              </p>
            </div>
          )}
        </div>
      ) : (
        !loadingSteps && (
          <div className="text-center py-8">
            <LightBulbIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">
              Get personalized step-by-step filing instructions based on your location and business type.
            </p>
            <p className="text-sm text-gray-500">
              Calculate your taxes first, then generate your custom filing guide.
            </p>
          </div>
        )
      )}
    </div>
  );
}