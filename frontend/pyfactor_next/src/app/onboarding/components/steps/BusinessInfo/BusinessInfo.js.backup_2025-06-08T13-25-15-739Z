'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useOnboarding } from '@/hooks/useOnboarding';
import { logger } from '@/utils/logger';
import Select from 'react-select';
import { Country, State } from 'country-state-city';
import { 
  businessTypes,
  legalStructures,
  gigEconomyOptions,
  truckingOptions,
  ecommerceOptions,
  restaurantOptions,
  realEstateOptions,
  healthcareOptions,
  accountingOptions,
  agricultureOptions,
  digitalMarketingOptions,
  softwareDevelopmentOptions,
  constructionOptions,
  creativeServicesOptions,
  manufacturingOptions,
  legalServicesOptions,
  educationOptions,
  photographyOptions,
  wellnessOptions,
  fitnessOptions,
  eventPlanningOptions,
  tourismOptions,
  renewableEnergyOptions,
  consultingOptions,
  homeServicesOptions,
  automotiveOptions,
  artsEntertainmentOptions,
  childcareOptions,
  itSupportOptions,
  foodProductionOptions,
  beautyOptions,
  printingOptions,
  importExportOptions,
  homeImprovementOptions,
  insuranceOptions,
  interiorDesignOptions,
  petServicesOptions,
  mediaProductionOptions,
  translationOptions,
  cateringOptions,
  transportationOptions,
  environmentalOptions,
  mobileAppOptions,
  socialMediaOptions,
  healthCoachingOptions,
  securityOptions,
  webDesignOptions,
  agriculturalEquipmentOptions,
  specialtyFoodOptions,
  speakingTrainingOptions,
  virtualAssistanceOptions,
  commercialCleaningOptions,
  hvacPlumbingOptions,
  dentalOptions,
  storageRentalOptions,
  adventureTourismOptions,
  aiDataScienceOptions,
  apparelClothingOptions,
  architectureDesignOptions,
  artsCraftsOptions,
  bankingFinanceOptions,
  beverageFoodOptions,
  biotechPharmaOptions,
  blockchainCryptoOptions,
  broadcastingMediaOptions,
  culturalHeritageOptions,
  droneAerialOptions,
  electronicsITEquipmentOptions,
  fashionApparelOptions,
  forestryOptions,
  franchisingOptions,
  fundraisingNonprofitOptions,
  furnitureHomeDecorOptions,
  humanResourcesOptions,
  jewelryWatchmakingOptions,
  journalismReportingOptions,
  leisureRecreationOptions,
  microfinanceOptions,
  miningExtractionOptions,
  publicSectorOptions,
  researchDevelopmentOptions,
  streetVendorOptions,
  textileManufacturingOptions,
  utilitiesPublicServicesOptions,
  youthServicesOptions,
  zoologicalBotanicalOptions
} from '@/app/utils/businessData';
const BusinessInfo = () => {
  const { handleBusinessInfoSubmit, isSubmitting } = useOnboarding();
  const [submitError, setSubmitError] = useState(null);
  const [stateOptions, setStateOptions] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedBusinessType, setSelectedBusinessType] = useState(null);
  const [businessTypeOptions, setBusinessTypeOptions] = useState([]);
  
  // Initialize business subtype settings
  const [businessSubtypeSelections, setBusinessSubtypeSelections] = useState({});
  
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm();
  
  const countryValue = watch('country');
  const businessTypeValue = watch('businessType');
  
  // Format business types for the select dropdown
  useEffect(() => {
    const options = businessTypes.map(type => ({
      value: type,
      label: type
    }));
    setBusinessTypeOptions(options);
  }, []);
  
  // Update state options when country changes
  useEffect(() => {
    if (countryValue) {
      const countryStates = State.getStatesOfCountry(countryValue);
      const formattedStates = countryStates.map(state => ({
        value: state.isoCode,
        label: state.name
      }));
      setStateOptions(formattedStates);
      setSelectedCountry(countryValue);
    } else {
      setStateOptions([]);
      setSelectedCountry(null);
    }
  }, [countryValue]);

  // Update when business type changes
  useEffect(() => {
    if (businessTypeValue) {
      setSelectedBusinessType(businessTypeValue);
      
      // Reset subtype selections when business type changes
      setBusinessSubtypeSelections({});
    } else {
      setSelectedBusinessType(null);
    }
  }, [businessTypeValue]);

// Get the second-level options for the selected business type
const getBusinessSubtypeOptions = () => {
  switch(selectedBusinessType) {
    case 'Accounting and Bookkeeping':
      return accountingOptions;
    case 'Administration and Office Services':
      return virtualAssistanceOptions;
    case 'Adventure Tourism and Tour Guides':
      return adventureTourismOptions;
    case 'Advertising and Marketing':
      return digitalMarketingOptions;
    case 'Agribusiness and Agricultural Consulting':
      return agricultureOptions;
    case 'Agricultural Machinery':
      return agriculturalEquipmentOptions;
    case 'Agriculture and Farming':
      return agricultureOptions;
    case 'Air Conditioning and HVAC Services':
      return hvacPlumbingOptions;
    case 'AI, Machine Learning, and Data Science Services':
      return aiDataScienceOptions;
    case 'Animal and Pet Services':
      return petServicesOptions;
    case 'Apparel and Clothing':
      return apparelClothingOptions;
    case 'Architecture and Design':
      return architectureDesignOptions;
    case 'Arts and Crafts':
      return artsCraftsOptions;
    case 'Automotive, Leasing, and Repair':
      return automotiveOptions;
    case 'Babysitting and Childcare Services':
      return childcareOptions;
    case 'Banking and Finance':
      return bankingFinanceOptions;
    case 'Barbershops, Hair Salons, and Beauty Services':
      return beautyOptions;
    case 'Beverage and Food Services':
      return beverageFoodOptions;
    case 'Biotechnology and Pharmaceuticals':
      return biotechPharmaOptions;
    case 'Blockchain, Cryptocurrencies, and Exchanges':
      return blockchainCryptoOptions;
    case 'Broadcasting, Media, and Video Streaming':
      return broadcastingMediaOptions;
    case 'Business Consulting and Advisory Services':
      return consultingOptions;
    case 'Catering and Food Trucks':
      return cateringOptions;
    case 'Cleaning Services':
      return commercialCleaningOptions;
    case 'Cloud Computing and IT Services':
      return itSupportOptions;
    case 'Construction and Contracting':
      return constructionOptions;
    case 'Craft Beverages (Breweries, Distilleries)':
      return beverageFoodOptions;
    case 'Creative Services (Design, Graphic Design)':
      return creativeServicesOptions;
    case 'Cultural Heritage and Preservation':
      return culturalHeritageOptions;
    case 'Cybersecurity and Risk Management':
      return securityOptions;
    case 'Data Analysis and Business Intelligence':
      return aiDataScienceOptions;
    case 'Dairy and Livestock Farming':
      return agricultureOptions;
    case 'Digital Marketing and Online Services':
      return digitalMarketingOptions;
    case 'DJ, Music, and Entertainment Services':
      return artsEntertainmentOptions;
    case 'Distribution, Freight Forwarding, and Logistics':
      return transportationOptions;
    case 'Drone and Aerial Services':
      return droneAerialOptions;
    case 'E-commerce and Retail':
      return ecommerceOptions;
    case 'Education and Tutoring':
      return educationOptions;
    case 'Electronics and IT Equipment':
      return electronicsITEquipmentOptions;
    case 'Energy Auditing and Sustainability Consulting':
      return renewableEnergyOptions;
    case 'Engineering and Technical Services':
      return consultingOptions;
    case 'Event Planning, Rentals, and Technology':
      return eventPlanningOptions;
    case 'Export and Import Trade':
      return importExportOptions;
    case 'Fashion and Apparel':
      return fashionApparelOptions;
    case 'Film, Television, and Media Production':
      return mediaProductionOptions;
    case 'Financial Planning and Investment Services':
      return consultingOptions;
    case 'Fishing and Aquaculture':
      return agricultureOptions;
    case 'Fitness and Personal Training':
      return fitnessOptions;
    case 'Floristry and Gardening':
      return homeServicesOptions;
    case 'Forestry and Natural Resource Management':
      return forestryOptions;
    case 'Franchising and Licensing':
      return franchisingOptions;
    case 'Freelance Platforms and Gig Economy':
      return gigEconomyOptions;
    case 'Fundraising and Non-Profit Services':
      return fundraisingNonprofitOptions;
    case 'Furniture and Home Decor':
      return furnitureHomeDecorOptions;
    case 'Green Building, Renewable Energy, and Solar':
      return renewableEnergyOptions;
    case 'Healthcare and Medical Services':
      return healthcareOptions;
    case 'Home Improvement and Renovation':
      return homeImprovementOptions;
    case 'Hospitality, Hotels, and Vacation Rentals':
      return tourismOptions;
    case 'Human Resources and Recruitment':
      return humanResourcesOptions;
    case 'Hydroelectric and Wind Energy':
      return renewableEnergyOptions;
    case 'Industrial Services and Manufacturing':
      return manufacturingOptions;
    case 'Insurance and Risk Management':
      return insuranceOptions;
    case 'Interior Design and Architecture':
      return interiorDesignOptions;
    case 'International Trade and Export':
      return importExportOptions;
    case 'IT Consulting and Services':
      return itSupportOptions;
    case 'Jewelry and Watchmaking':
      return jewelryWatchmakingOptions;
    case 'Journalism and Reporting':
      return journalismReportingOptions;
    case 'Landscaping and Lawn Care':
      return homeServicesOptions;
    case 'Law and Legal Services':
      return legalServicesOptions;
    case 'Leisure, Recreation, and Sports':
      return leisureRecreationOptions;
    case 'Logistics and Supply Chain Management':
      return transportationOptions;
    case 'Manufacturing and Production':
      return manufacturingOptions;
    case 'Media and Entertainment':
      return mediaProductionOptions;
    case 'Medical Equipment and Devices':
      return healthcareOptions;
    case 'Microfinance and Small Business Lending':
      return microfinanceOptions;
    case 'Mining and Resource Extraction':
      return miningExtractionOptions;
    case 'Mobile Services and Telecommunications':
      return mobileAppOptions;
    case 'Music Production and DJ Services':
      return artsEntertainmentOptions;
    case 'Natural Resource Extraction and Mining':
      return miningExtractionOptions;
    case 'Non-Profit and Charitable Organizations':
      return fundraisingNonprofitOptions;
    case 'Oil, Gas, and Petroleum Refining':
      return miningExtractionOptions;
    case 'On-Demand and Gig Economy (Uber, Lyft)':
      return gigEconomyOptions;
    case 'Packaging and Distribution Services':
      return transportationOptions;
    case 'Personal Services (Babysitting, Caregiving)':
      return childcareOptions;
    case 'Petroleum, Gas, and Energy Services':
      return miningExtractionOptions;
    case 'Photography and Videography':
      return photographyOptions;
    case 'Printing, Publishing, and Copy Services':
      return printingOptions;
    case 'Private Investigation and Security Services':
      return securityOptions;
    case 'Property Development and Management':
      return realEstateOptions;
    case 'Public Relations and Communications':
      return digitalMarketingOptions;
    case 'Public Sector and Government Services':
      return publicSectorOptions;
    case 'Public Transportation and Taxi Services':
      return transportationOptions;
    case 'Real Estate and Property Management':
      return realEstateOptions;
    case 'Renewable Energy and Green Tech':
      return renewableEnergyOptions;
    case 'Research and Development (R&D)':
      return researchDevelopmentOptions;
    case 'Restaurants, Cafes, and Food Services':
      return restaurantOptions;
    case 'Retail and Consumer Goods':
      return ecommerceOptions;
    case 'Security and Alarm Services':
      return securityOptions;
    case 'Shipping, Maritime, and Port Services':
      return transportationOptions;
    case 'Software Development and IT Services':
      return softwareDevelopmentOptions;
    case 'Solar Energy and Installation':
      return renewableEnergyOptions;
    case 'Sports Coaching and Training':
      return fitnessOptions;
    case 'Street Vendors and Micro-Enterprises':
      return streetVendorOptions;
    case 'Sustainability Consulting and Green Energy':
      return renewableEnergyOptions;
    case 'Telecommunications and Mobile Services':
      return mobileAppOptions;
    case 'Textile Manufacturing and Apparel':
      return textileManufacturingOptions;
    case 'Tourism, Travel Agencies, and Adventure Travel':
      return tourismOptions;
    case 'Transportation, Trucking, and Freight':
      return truckingOptions;
    case 'Utilities and Public Services':
      return utilitiesPublicServicesOptions;
    case 'Vehicle Rental and Leasing':
      return automotiveOptions;
    case 'Veterinary and Pet Services':
      return petServicesOptions;
    case 'Virtual Assistant and Administrative Services':
      return virtualAssistanceOptions;
    case 'Waste Management and Recycling':
      return environmentalOptions;
    case 'Web Development and Design Services':
      return webDesignOptions;
    case 'Wellness and Spa Services':
      return wellnessOptions;
    case 'Wholesale and Distribution':
      return transportationOptions;
    case 'Writing, Editing, and Content Creation':
      return creativeServicesOptions;
    case 'Youth Services and Education':
      return youthServicesOptions;
    case 'Zoological Services, Botanical Gardens, and Consultancy':
      return zoologicalBotanicalOptions;
    default:
      return null;
  }
};

  const handleSubtypeChange = (category, value) => {
    setBusinessSubtypeSelections(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const onSubmit = async (data) => {
    try {
      setSubmitError(null);

      // Add business subtype selections to the submission data
      const submissionData = {
        ...data,
        businessSubtypeSelections: businessSubtypeSelections
      };

      // Log form data before submission
      logger.debug('Business info form data:', {
        data: submissionData,
        hasData: !!submissionData,
        fields: Object.keys(submissionData)
      });

      await handleBusinessInfoSubmit(submissionData);
    } catch (error) {
      logger.error('Error submitting business info:', error);
      setSubmitError(error.message || 'Failed to save business information');
    }
  };

  // List of countries for dropdown
  const countryOptions = Country.getAllCountries().map(country => ({
    value: country.isoCode,
    label: country.name
  }));

  // Helper function to render business subtype selection fields
  const renderBusinessSubtypeFields = () => {
    const subtypeOptions = getBusinessSubtypeOptions();
    
    if (!subtypeOptions) return null;
    
    return (
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium mb-4">Tell us more about your {selectedBusinessType} business</h3>
        
        {Object.entries(subtypeOptions).map(([category, options]) => {
          if (Array.isArray(options)) {
            // Simple array options
            return (
              <div key={category} className="mb-4">
                <label className="block mb-2 font-medium">
                  {category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </label>
                <Select
                  options={options.map(option => ({ value: option, label: option }))}
                  value={businessSubtypeSelections[category] ? 
                    { value: businessSubtypeSelections[category], label: businessSubtypeSelections[category] } : 
                    null
                  }
                  onChange={(selected) => handleSubtypeChange(category, selected.value)}
                  className="mt-1"
                  placeholder={`Select ${category}`}
                />
              </div>
            );
          } else if (typeof options === 'object') {
            // Nested object options
            return (
              <div key={category} className="mb-4">
                <label className="block mb-2 font-medium">
                  {category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </label>
                {Object.entries(options).map(([subCategory, subOptions]) => (
                  <div key={subCategory} className="ml-4 mb-2">
                    <label className="block mb-1">
                      {subCategory.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </label>
                    <Select
                      options={subOptions.map(option => ({ value: option, label: option }))}
                      value={businessSubtypeSelections[`${category}.${subCategory}`] ? 
                        { value: businessSubtypeSelections[`${category}.${subCategory}`], label: businessSubtypeSelections[`${category}.${subCategory}`] } : 
                        null
                      }
                      onChange={(selected) => handleSubtypeChange(`${category}.${subCategory}`, selected.value)}
                      className="mt-1"
                      placeholder={`Select ${subCategory}`}
                      isMulti={subCategory.includes('marketplaces')} // Enable multi-select for marketplaces and similar fields
                    />
                  </div>
                ))}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Business Information</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block mb-2">
            Business Name *
            <input
              {...register('businessName', {
                required: 'Business name is required',
                minLength: {
                  value: 1,
                  message: 'Business name is required'
                },
                maxLength: {
                  value: 256,
                  message: 'Business name must be less than 256 characters'
                }
              })}
              type="text"
              className="w-full p-2 border rounded mt-1"
            />
          </label>
          {errors.businessName && (
            <p className="text-red-500 text-sm mt-1">{errors.businessName.message}</p>
          )}
        </div>

        <div>
          <label className="block mb-2">
            Business Type *
            <Controller
              name="businessType"
              control={control}
              rules={{ required: 'Business type is required' }}
              render={({ field }) => (
                <Select
                  options={businessTypeOptions}
                  value={businessTypeOptions.find(option => option.value === field.value) || null}
                  onChange={(option) => field.onChange(option.value)}
                  className="mt-1"
                  placeholder="Select Business Type"
                />
              )}
            />
          </label>
          {errors.businessType && (
            <p className="text-red-500 text-sm mt-1">{errors.businessType.message}</p>
          )}
        </div>

        {/* Render business subtype fields if a business type is selected */}
        {selectedBusinessType && renderBusinessSubtypeFields()}

        <div>
          <label className="block mb-2">
            Country *
            <Controller
              name="country"
              control={control}
              rules={{ required: 'Country is required' }}
              render={({ field }) => (
                <Select
                  options={countryOptions}
                  value={countryOptions.find(c => c.value === field.value) || null}
                  onChange={(option) => field.onChange(option.value)}
                  className="mt-1"
                  placeholder="Select Country"
                />
              )}
            />
          </label>
          {errors.country && (
            <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>
          )}
        </div>

        {/* State/Region field - conditionally rendered */}
        {selectedCountry && stateOptions.length > 0 && (
          <div>
            <label className="block mb-2">
              State/Region *
              <Controller
                name="businessState"
                control={control}
                rules={{ required: 'State/Region is required' }}
                render={({ field }) => (
                  <Select
                    options={stateOptions}
                    value={stateOptions.find(s => s.value === field.value) || null}
                    onChange={(option) => field.onChange(option.value)}
                    className="mt-1"
                    placeholder="Select State/Region"
                  />
                )}
              />
            </label>
            {errors.businessState && (
              <p className="text-red-500 text-sm mt-1">{errors.businessState.message}</p>
            )}
          </div>
        )}

        <div>
          <label className="block mb-2">
            Legal Structure *
            <Controller
              name="legalStructure"
              control={control}
              rules={{ required: 'Legal structure is required' }}
              render={({ field }) => (
                <Select
                  options={legalStructures.map(structure => ({ value: structure, label: structure }))}
                  value={legalStructures.map(structure => ({ value: structure, label: structure })).find(s => s.value === field.value) || null}
                  onChange={(option) => field.onChange(option.value)}
                  className="mt-1"
                  placeholder="Select Legal Structure"
                />
              )}
            />
          </label>
          {errors.legalStructure && (
            <p className="text-red-500 text-sm mt-1">{errors.legalStructure.message}</p>
          )}
        </div>

        <div>
          <label className="block mb-2">
            Date Founded *
            <input
              {...register('dateFounded', {
                required: 'Date founded is required',
                pattern: {
                  value: /^\d{4}-\d{2}-\d{2}$/,
                  message: 'Please use YYYY-MM-DD format'
                }
              })}
              type="date"
              className="w-full p-2 border rounded mt-1"
            />
          </label>
          {errors.dateFounded && (
            <p className="text-red-500 text-sm mt-1">{errors.dateFounded.message}</p>
          )}
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full p-3 rounded text-white ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? 'Saving...' : 'Save and Continue'}
        </button>
      </form>
    </div>
  );
};

export default BusinessInfo;