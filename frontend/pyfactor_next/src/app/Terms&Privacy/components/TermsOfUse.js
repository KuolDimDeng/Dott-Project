'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { I18nextProvider } from 'react-i18next';
import i18nInstance from '@/i18n';

const TermsOfUseContent = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [fromDashboard, setFromDashboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if screen is mobile size
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Initial check
    checkIfMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIfMobile);
    
    // Check for referrer on client side
    if (typeof window !== 'undefined') {
      try {
        const referer = document.referrer;
        const isFromDashboard = referer.includes('/dashboard') || sessionStorage.getItem('fromDashboard') === 'true';
        setFromDashboard(isFromDashboard);
        
        // Save the fact that we're in terms from dashboard
        if (isFromDashboard) {
          sessionStorage.setItem('fromDashboard', 'true');
        }
      } catch (error) {
        console.error("Error checking referrer:", error);
      }
    }
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  const handleBackClick = () => {
    try {
      if (fromDashboard) {
        // Clear the fromDashboard flag
        sessionStorage.removeItem('fromDashboard');
        
        // Use direct location navigation which is more reliable for going back to dashboard
        window.location.href = '/dashboard';
      } else {
        // For non-dashboard returns, router.push is fine
        router.push('/');
      }
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback navigation using direct location method
      window.location.href = fromDashboard ? '/dashboard' : '/';
    }
  };

  const SectionTitle = ({ children }) => (
    <h2 className={`font-bold text-blue-700 ${isMobile ? 'text-lg' : 'text-xl'} mt-6 mb-4`}>
      {children}
    </h2>
  );

  const SectionContent = ({ children }) => (
    <p className="mb-4 leading-relaxed text-gray-600">
      {children}
    </p>
  );
  
  const SubsectionTitle = ({ children }) => (
    <h3 className={`font-bold text-gray-800 mt-4 mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
      {children}
    </h3>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="flex justify-between items-center mt-8">
        <button 
          onClick={handleBackClick}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {fromDashboard ? t('termsOfService.navigation.backToDashboard') : t('termsOfService.navigation.backToHome')}
        </button>
        
        <div 
          onClick={handleBackClick} 
          className="cursor-pointer flex items-center"
        >
          <Image
            src="/static/images/PyfactorLandingpage.png"
            alt="Dott Logo"
            width={120}
            height={50}
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>
      
      <div className="mt-4 mb-12 bg-white rounded-lg shadow-lg p-6 sm:p-10">
        <h1 className={`text-center font-bold ${isMobile ? 'text-2xl' : 'text-3xl'} mb-3`}>
          {t('termsOfService.title')}
        </h1>

        <p className="text-center text-gray-600 mb-6">
          {t('termsOfService.effectiveDate', { date: new Date().toLocaleDateString() })}
        </p>

        <hr className="my-6 border-t border-gray-200" />

        <SectionContent>
          {t('termsOfService.introduction')}
        </SectionContent>

        <SectionTitle>{t('termsOfService.sections.acceptance.title')}</SectionTitle>
        <SectionContent>
          {t('termsOfService.sections.acceptance.content')}
        </SectionContent>

        <SectionTitle>{t('termsOfService.sections.service.title')}</SectionTitle>
        <SectionContent>
          {t('termsOfService.sections.service.content')}
        </SectionContent>

        <SectionTitle>{t('termsOfService.sections.accounts.title')}</SectionTitle>
        <SectionContent>
          {t('termsOfService.sections.accounts.content')}
        </SectionContent>

        <SectionTitle>{t('termsOfService.sections.payments.title')}</SectionTitle>
        <SectionContent>
          {t('termsOfService.sections.payments.content')}
        </SectionContent>
        
        <SubsectionTitle>{t('termsOfService.sections.payments.recurring.title')}</SubsectionTitle>
        <SectionContent>
          {t('termsOfService.sections.payments.recurring.content')}
        </SectionContent>
        
        <SubsectionTitle>{t('termsOfService.sections.payments.processing.title')}</SubsectionTitle>
        <SectionContent>
          {t('termsOfService.sections.payments.processing.content')}
        </SectionContent>
        
        <SubsectionTitle>{t('termsOfService.sections.payments.refunds.title')}</SubsectionTitle>
        <SectionContent>
          {t('termsOfService.sections.payments.refunds.content')}
        </SectionContent>

        <SectionTitle>{t('termsOfService.sections.conduct.title')}</SectionTitle>
        <SectionContent>
          {t('termsOfService.sections.conduct.content')}
        </SectionContent>
        <ul className="list-disc pl-8 mb-6">
          <li className="mb-2 text-gray-600">
            {t('termsOfService.sections.conduct.violations.law')}
          </li>
          <li className="mb-2 text-gray-600">
            {t('termsOfService.sections.conduct.violations.material')}
          </li>
          <li className="mb-2 text-gray-600">
            {t('termsOfService.sections.conduct.violations.impersonation')}
          </li>
          <li className="mb-2 text-gray-600">
            {t('termsOfService.sections.conduct.violations.interference')}
          </li>
          <li className="mb-2 text-gray-600">
            {t('termsOfService.sections.conduct.violations.security')}
          </li>
          <li className="mb-2 text-gray-600">
            {t('termsOfService.sections.conduct.violations.financial')}
          </li>
        </ul>

        <SectionTitle>{t('termsOfService.sections.financial.title')}</SectionTitle>
        <SectionContent>
          {t('termsOfService.sections.financial.content')}
        </SectionContent>
        
        <SubsectionTitle>{t('termsOfService.sections.financial.processing.title')}</SubsectionTitle>
        <SectionContent>
          {t('termsOfService.sections.financial.processing.content')}
        </SectionContent>
        
        <SubsectionTitle>{t('termsOfService.sections.financial.factoring.title')}</SubsectionTitle>
        <SectionContent>
          {t('termsOfService.sections.financial.factoring.content')}
        </SectionContent>
        
        <SubsectionTitle>{t('termsOfService.sections.financial.international.title')}</SubsectionTitle>
        <SectionContent>
          {t('termsOfService.sections.financial.international.content')}
        </SectionContent>

        <SectionTitle>{t('termsOfService.sections.data.title')}</SectionTitle>
        <SectionContent>
          {t('termsOfService.sections.data.content')}
        </SectionContent>
        
        <SubsectionTitle>{t('termsOfService.sections.data.processing.title')}</SubsectionTitle>
        <SectionContent>
          {t('termsOfService.sections.data.processing.content')}
        </SectionContent>
        
        <SubsectionTitle>{t('termsOfService.sections.data.security.title')}</SubsectionTitle>
        <SectionContent>
          {t('termsOfService.sections.data.security.content')}
        </SectionContent>

        <SectionTitle>8. Intellectual Property</SectionTitle>
        <SectionContent>
          All content and functionality on Dott, including but not limited to text, graphics, logos, icons, images, audio clips, 
          digital downloads, data compilations, and software, is the property of Dott LLC or its licensors and is protected by 
          United States and international copyright, trademark, patent, trade secret, and other intellectual property or proprietary 
          rights laws. The compilation of all content and any software or other materials on Dott are the exclusive property of Dott LLC 
          and protected by U.S. and international copyright laws.
        </SectionContent>

        <SectionTitle>9. Privacy</SectionTitle>
        <SectionContent>
          Your privacy is important to us. Our Privacy Policy, which is incorporated into this Agreement by reference, 
          explains how we collect, use, and disclose information about you. By using Dott, you consent to the collection 
          and use of information as described in our Privacy Policy.
        </SectionContent>

        <SectionTitle>10. Third-Party Links and Services</SectionTitle>
        <SectionContent>
          Dott may contain links to third-party websites or services that are not owned or controlled by Dott LLC. 
          Dott LLC has no control over, and assumes no responsibility for, the content, privacy policies, or practices 
          of any third-party websites or services. You acknowledge and agree that Dott LLC shall not be responsible or 
          liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with the 
          use of or reliance on any such content, goods, or services available on or through any such websites or services.
        </SectionContent>

        <SectionTitle>11. Disclaimer of Warranties</SectionTitle>
        <SectionContent>
          DOTT IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE 
          FULLEST EXTENT PERMISSIBLE PURSUANT TO APPLICABLE LAW, DOTT LLC DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, 
          INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND 
          NON-INFRINGEMENT. DOTT LLC DOES NOT WARRANT THAT THE FUNCTIONS CONTAINED IN DOTT WILL BE UNINTERRUPTED OR ERROR-FREE, 
          THAT DEFECTS WILL BE CORRECTED, OR THAT DOTT OR THE SERVER THAT MAKES IT AVAILABLE ARE FREE OF VIRUSES OR OTHER 
          HARMFUL COMPONENTS.
        </SectionContent>

        <SectionTitle>12. Tax Information and Disclaimer</SectionTitle>
        <SectionContent>
          DOTT PROVIDES TAX CALCULATION FEATURES AND AI-POWERED TAX RATE SUGGESTIONS AS A CONVENIENCE TOOL ONLY. THESE FEATURES 
          DO NOT CONSTITUTE TAX ADVICE, LEGAL ADVICE, OR FINANCIAL ADVICE OF ANY KIND. TAX LAWS ARE COMPLEX AND CHANGE FREQUENTLY, 
          AND THEY VARY BY JURISDICTION.
        </SectionContent>
        
        <SubsectionTitle>12.1 User Responsibility for Tax Compliance</SubsectionTitle>
        <SectionContent>
          You acknowledge and agree that:
        </SectionContent>
        <ul className="list-disc pl-8 mb-6">
          <li className="mb-2 text-gray-600">
            You are solely responsible for ensuring all tax rates, calculations, and filings are accurate and comply with applicable laws.
          </li>
          <li className="mb-2 text-gray-600">
            AI-powered tax suggestions are based on general information and may not reflect current tax rates or special circumstances.
          </li>
          <li className="mb-2 text-gray-600">
            You must independently verify all tax rates before using them in any business or financial calculations.
          </li>
          <li className="mb-2 text-gray-600">
            You should consult with qualified tax professionals for advice specific to your situation.
          </li>
          <li className="mb-2 text-gray-600">
            Incorrect tax calculations may result in penalties, interest, and legal consequences for which you are fully responsible.
          </li>
        </ul>
        
        <SubsectionTitle>12.2 No Professional Advice</SubsectionTitle>
        <SectionContent>
          Nothing in Dott should be construed as professional tax, legal, or financial advice. The tax features are provided for 
          informational and computational purposes only. Dott LLC, its employees, agents, and partners are not tax advisors, 
          attorneys, or certified public accountants, and are not engaged in rendering tax, legal, or financial advice.
        </SectionContent>
        
        <SubsectionTitle>12.3 Disclaimer of Tax Feature Accuracy</SubsectionTitle>
        <SectionContent>
          DOTT LLC MAKES NO WARRANTIES OR REPRESENTATIONS REGARDING THE ACCURACY, COMPLETENESS, OR TIMELINESS OF ANY TAX RATES, 
          CALCULATIONS, OR SUGGESTIONS PROVIDED THROUGH THE SERVICE. TAX INFORMATION MAY BE OUTDATED, INCOMPLETE, OR INCORRECT. 
          YOU USE ALL TAX FEATURES AT YOUR OWN RISK.
        </SectionContent>

        <SectionTitle>13. Limitation of Liability</SectionTitle>
        <SectionContent>
          TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL DOTT LLC, ITS AFFILIATES, OFFICERS, DIRECTORS, 
          EMPLOYEES, AGENTS, SUPPLIERS OR LICENSORS BE LIABLE FOR ANY INDIRECT, SPECIAL, INCIDENTAL, PUNITIVE, EXEMPLARY OR 
          CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF USE, DATA, BUSINESS, OR PROFITS) ARISING OUT OF OR IN CONNECTION WITH THIS 
          AGREEMENT, WHETHER BASED ON BREACH OF CONTRACT, TORT (INCLUDING NEGLIGENCE), PRODUCT LIABILITY OR OTHERWISE, EVEN IF 
          DOTT LLC OR ITS REPRESENTATIVES HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES AND EVEN IF A REMEDY SET FORTH 
          HEREIN IS FOUND TO HAVE FAILED OF ITS ESSENTIAL PURPOSE.
        </SectionContent>
        
        <SubsectionTitle>13.1 Limitation of Total Liability</SubsectionTitle>
        <SectionContent>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, DOTT LLC'S TOTAL LIABILITY TO YOU FOR ANY DAMAGES (REGARDLESS OF 
          THE FOUNDATION FOR THE ACTION) SHALL NOT EXCEED THE AMOUNT YOU HAVE PAID DOTT LLC IN THE PRIOR 12 MONTHS.
        </SectionContent>

        <SectionTitle>14. Indemnification</SectionTitle>
        <SectionContent>
          You agree to indemnify, defend and hold harmless Dott LLC, its affiliates, officers, directors, employees, agents and 
          third parties, for any losses, costs, liabilities and expenses (including reasonable attorney's fees) relating to or 
          arising out of your use of Dott, including but not limited to any breach by you of the terms of this Agreement or 
          violation of any law, regulation, or third-party rights.
        </SectionContent>

        <SectionTitle>15. Termination</SectionTitle>
        <SectionContent>
          Dott LLC reserves the right to terminate or suspend your account and access to Dott immediately, without prior notice or 
          liability, for any reason whatsoever, including, without limitation, if you breach this Agreement. Upon termination, 
          your right to use Dott will immediately cease. All provisions of this Agreement which by their nature should survive 
          termination shall survive termination, including, without limitation, ownership provisions, warranty disclaimers, indemnity, 
          and limitations of liability.
        </SectionContent>
        
        <SubsectionTitle>15.1 Data After Termination</SubsectionTitle>
        <SectionContent>
          Upon termination, you may request a copy of your data within 30 days. After this period, we may delete your data 
          in accordance with our data retention policies and applicable laws.
        </SectionContent>

        <SectionTitle>16. Governing Law</SectionTitle>
        <SectionContent>
          This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without 
          regard to its conflict of law provisions. You agree to submit to the personal and exclusive jurisdiction of the 
          courts located within Delaware for the resolution of any disputes.
        </SectionContent>

        <SectionTitle>17. Compliance with Laws</SectionTitle>
        <SectionContent>
          You agree to comply with all applicable domestic and international laws, statutes, ordinances, and regulations regarding 
          your use of Dott and any financial transactions conducted through it. Dott LLC reserves the right to investigate and take 
          appropriate legal action against anyone who, in Dott LLC's sole discretion, violates this provision.
        </SectionContent>

        <SectionTitle>18. Changes to Agreement</SectionTitle>
        <SectionContent>
          We reserve the right, at our sole discretion, to modify or replace this Agreement at any time. If a revision is material, 
          we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be 
          determined at our sole discretion. By continuing to access or use Dott after those revisions become effective, you agree 
          to be bound by the revised Agreement.
        </SectionContent>

        <SectionTitle>19. Entire Agreement</SectionTitle>
        <SectionContent>
          This Agreement, together with our Privacy Policy and any other legal notices and agreements published by Dott LLC, shall 
          constitute the entire agreement between you and Dott LLC concerning Dott.
        </SectionContent>

        <SectionTitle>20. Severability</SectionTitle>
        <SectionContent>
          If any provision of this Agreement is found to be unenforceable or invalid, that provision will be limited or eliminated 
          to the minimum extent necessary so that this Agreement will otherwise remain in full force and effect and enforceable.
        </SectionContent>

        <SectionTitle>{t('termsOfService.sections.contact.title')}</SectionTitle>
        <SectionContent>
          {t('termsOfService.sections.contact.content')}
        </SectionContent>
        
        <div className="pl-4 border-l-4 border-blue-700 mt-4 text-gray-700 italic">
          <address className="not-italic text-sm">
            {t('termsOfService.contactInfo.company')}
            <br />
            {t('termsOfService.contactInfo.address')}
            <br />
            {t('termsOfService.contactInfo.suite')}
            <br />
            {t('termsOfService.contactInfo.city')}
            <br />
            {t('termsOfService.contactInfo.country')}
            <br />
            <br />
            {t('termsOfService.contactInfo.email')}
          </address>
        </div>
      </div>
    </div>
  );
};

const TermsOfUse = () => {
  return (
    <I18nextProvider i18n={i18nInstance}>
      <TermsOfUseContent />
    </I18nextProvider>
  );
};

export default TermsOfUse;