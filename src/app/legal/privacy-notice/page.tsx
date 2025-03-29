import React from 'react';

export const metadata = {
  title: 'Privacy Notice | WideToeBox',
  description: 'Privacy notice regarding data collection and usage at WideToeBox',
};

export default function PrivacyNoticePage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Privacy Notice</h1>

      <div className="prose prose-lg max-w-none">
        <p className="mb-4">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Information Collection and Usage</h2>

        <p className="mb-4">
          At WideToeBox, we value your privacy and want to be transparent about how we collect, use, and share your information. 
          This privacy notice specifically addresses how we handle the questions you submit through our "Ask an Expert" feature.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Questions Storage and Processing</h2>

        <p className="mb-4">
          When you submit questions through our "Ask an Expert" feature, please be aware that:
        </p>

        <ul className="list-disc pl-8 mb-4">
          <li>Your questions and any information you provide are stored in a Langsmith Cloud database</li>
          <li>We use this information to provide you with personalized responses</li>
          <li>Your questions are processed using OpenAI's artificial intelligence and machine learning technologies</li>
          <li>We may analyze patterns in questions to improve our service and recommendations</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Third-Party Usage</h2>

        <p className="mb-4">
          We want you to be aware that the questions you submit and information you provide may be shared with or accessed by third parties:
        </p>

        <ul className="list-disc pl-8 mb-4">
          <li>OpenAI, as questions are sent to OpenAI's services for answer completion</li>
          <li>Our technology partners who help us process and analyze the data</li>
          <li>Shoe manufacturers and retailers who may use this information to improve their products and services</li>
          <li>Marketing partners who may use this information to provide more relevant content and offers</li>
          <li>Researchers who may analyze trends in footwear preferences and needs</li>
        </ul>

        <p className="mb-4">
          We take reasonable measures to ensure that any third parties with whom we share your information maintain appropriate data security practices.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Your Consent</h2>

        <p className="mb-4">
          By using our "Ask an Expert" feature, you consent to the collection, storage, processing, and sharing of your questions and related information 
          as described in this privacy notice. If you do not agree with these terms, please do not use the "Ask an Expert" feature.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Data Retention</h2>

        <p className="mb-4">
          We retain your questions and related information for as long as necessary to fulfill the purposes outlined in this privacy notice, 
          unless a longer retention period is required or permitted by law.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Your Rights</h2>

        <p className="mb-4">
          Depending on your location, you may have certain rights regarding your personal information, such as the right to access, correct, 
          or delete your data. To exercise these rights or if you have any questions about our privacy practices, please contact us at hello@barefootrunreview.com.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">Changes to This Privacy Notice</h2>

        <p className="mb-4">
          We may update this privacy notice from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. 
          We encourage you to review this notice periodically.
        </p>
      </div>
    </div>
  );
}
