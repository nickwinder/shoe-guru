import React from 'react';

export const metadata = {
  title: 'Terms of Service | WideToeBox',
  description: 'Terms of service for WideToeBox',
};

export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      
      <div className="prose prose-lg max-w-none">
        <p className="mb-4">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Agreement to Terms</h2>
        
        <p className="mb-4">
          By accessing or using WideToeBox, you agree to be bound by these Terms of Service and all applicable laws and regulations. 
          If you do not agree with any of these terms, you are prohibited from using or accessing this site.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Use License</h2>
        
        <p className="mb-4">
          Permission is granted to temporarily view the materials on WideToeBox's website for personal, non-commercial use only. 
          This is the grant of a license, not a transfer of title, and under this license you may not:
        </p>
        
        <ul className="list-disc pl-8 mb-4">
          <li>Modify or copy the materials</li>
          <li>Use the materials for any commercial purpose or for any public display</li>
          <li>Attempt to reverse engineer any software contained on WideToeBox's website</li>
          <li>Remove any copyright or other proprietary notations from the materials</li>
          <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Ask an Expert Feature</h2>
        
        <p className="mb-4">
          Our "Ask an Expert" feature allows you to submit questions about shoes and receive personalized responses. By using this feature, you agree that:
        </p>
        
        <ul className="list-disc pl-8 mb-4">
          <li>You will not submit any content that is unlawful, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable</li>
          <li>You will not impersonate any person or entity or falsely state or otherwise misrepresent your affiliation with a person or entity</li>
          <li>You grant us a non-exclusive, royalty-free, perpetual, irrevocable, and fully sublicensable right to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, and display your questions and any information you provide</li>
          <li>You understand that your questions and information may be stored, processed, and shared as described in our Privacy Notice</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Disclaimer</h2>
        
        <p className="mb-4">
          The materials on WideToeBox's website are provided on an 'as is' basis. WideToeBox makes no warranties, expressed or implied, 
          and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, 
          fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
        </p>
        
        <p className="mb-4">
          Further, WideToeBox does not warrant or make any representations concerning the accuracy, likely results, or reliability of the use of 
          the materials on its website or otherwise relating to such materials or on any sites linked to this site.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Limitations</h2>
        
        <p className="mb-4">
          In no event shall WideToeBox or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, 
          or due to business interruption) arising out of the use or inability to use the materials on WideToeBox's website, even if WideToeBox or a 
          WideToeBox authorized representative has been notified orally or in writing of the possibility of such damage.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Governing Law</h2>
        
        <p className="mb-4">
          These terms and conditions are governed by and construed in accordance with the laws of the United States, and you irrevocably submit to 
          the exclusive jurisdiction of the courts in that location.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Changes to Terms</h2>
        
        <p className="mb-4">
          WideToeBox may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be 
          bound by the then current version of these terms of service.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
        
        <p className="mb-4">
          If you have any questions about these Terms of Service, please contact us at hello@barefootrunreview.com.
        </p>
      </div>
    </div>
  );
}
