import React from 'react';

export const metadata = {
  title: 'Affiliate Disclosure | WideToeBox',
  description: 'Affiliate disclosure information for WideToeBox',
};

export default function AffiliateDisclosurePage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Affiliate Disclosure</h1>
      
      <div className="prose prose-lg max-w-none">
        <p className="mb-4">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">FTC Disclosure Compliance</h2>
        
        <p className="mb-4">
          In accordance with the Federal Trade Commission's guidelines concerning the use of endorsements and testimonials in advertising, 
          we want to make it clear to our visitors that some of the links on our website are affiliate links. This means that if you click 
          on these links and make a purchase, we may receive a commission.
        </p>
        
        <p className="mb-4">
          WideToeBox is a participant in various affiliate marketing programs, which means we may get paid commissions on products purchased 
          through our links to retailer sites. These affiliate relationships do not affect our product recommendations or the prices you pay.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Our Commitment to You</h2>
        
        <p className="mb-4">
          We only recommend products that we believe will be valuable to our readers. Our opinions and product evaluations are not influenced 
          by the commissions we may receive. We strive to provide honest, thorough, and unbiased reviews of all products we feature.
        </p>
        
        <p className="mb-4">
          When we recommend a product and you click on a link that takes you to a retailer's website, please be aware that we may receive a 
          commission if you make a purchase. However, this does not increase the cost of the product to you.
        </p>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Affiliate Programs We Participate In</h2>
        
        <p className="mb-4">
          We currently participate in affiliate programs with various companies including, but not limited to:
        </p>
        
        <ul className="list-disc pl-8 mb-4">
          <li>Amazon Associates</li>
          <li>REI</li>
          <li>Running Warehouse</li>
          <li>Other running shoe retailers</li>
        </ul>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Questions?</h2>
        
        <p className="mb-4">
          If you have any questions about our affiliate disclosure policy, please contact us at hello@barefootrunreview.com.
        </p>
      </div>
    </div>
  );
}
