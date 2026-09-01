/// Bundled legal copy — mirrors the web `Legal.tsx` content (Terms of Use v1.4,
/// Privacy Notice v1.1). Static text, kept in sync with the web version by hand.
class LegalSection {
  final String heading;
  final List<String> paragraphs;
  const LegalSection(this.heading, this.paragraphs);
}

class LegalDoc {
  final String title;
  final String version;
  final String updated;
  final List<LegalSection> sections;
  const LegalDoc({
    required this.title,
    required this.version,
    required this.updated,
    required this.sections,
  });
}

const kLegalPreamble =
    'This document is an electronic record published in accordance with the '
    'Information Technology Act, 2000 and the rules thereunder, and does not '
    'require any physical or digital signature.';

const kTermsDoc = LegalDoc(
  title: 'FreshCart Terms of Use',
  version: 'Version 1.4',
  updated: 'Last updated: 1 November 2025',
  sections: [
    LegalSection('1. Terms of Use', [
      '1.1. The websites www.freshcart.com, www.freshcartnow.com ("Website") and '
          'the mobile application "FreshCart" ("App") (collectively, the "Platform") '
          'are owned, operated and managed by FreshCart Marketplace Private Limited, '
          'a company incorporated under the Indian Companies Act, 2013, with its '
          'registered office at First Floor, 773, Sarjapur Main Road, Bengaluru, '
          'Karnataka-560103.',
      '1.2. These terms of use ("Terms") govern your use of the Platform. '
          '"FreshCart", "We", "Us" or "Our" refers to FreshCart Marketplace Private '
          'Limited, including its subsidiaries, holding company and affiliates as the '
          'context requires.',
    ]),
    LegalSection('2. Services & 10-Minute Delivery Commitment', [
      '2.1. FreshCart enables quick-commerce delivery of groceries, fresh fruits, '
          'vegetables, dairy, household items and personal care products directly to '
          'your designated address via localized dark stores.',
      '2.2. Displayed delivery estimates (e.g. 10 minutes) are target timeframes '
          'subject to rider availability, traffic regulations, weather conditions and '
          'the accuracy of the delivery location you provide.',
    ]),
    LegalSection('3. User Account & Security', [
      '3.1. You are responsible for maintaining the confidentiality of your mobile '
          'number and OTP credentials. All activity from your registered account is '
          'deemed authorised by you.',
      '3.2. FreshCart may suspend or terminate accounts engaged in fraudulent '
          'orders, abuse toward delivery partners, or violation of applicable laws.',
    ]),
    LegalSection('4. Pricing, Payments & Invoicing', [
      '4.1. Prices shown on the Platform are inclusive of applicable taxes unless '
          'stated otherwise. The final bill at checkout is payable via UPI, credit / '
          'debit card, net banking, or cash on delivery.',
    ]),
  ],
);

const kPrivacyDoc = LegalDoc(
  title: 'Privacy Notice',
  version: 'Version 1.1',
  updated: 'Last updated: 17 June 2025',
  sections: [
    LegalSection('1. Privacy Notice Overview', [
      '1.1. This Notice applies to FreshCart Marketplace Private Limited ("FreshCart" '
          'or "the Company"), incorporated under the Companies Act, 2013, with its '
          'registered office at First Floor, 773, Sarjapur Main Road, Bengaluru, '
          'Karnataka-560103, owner of www.freshcart.com, www.freshcartnow.com and the '
          'FreshCart mobile application (collectively, the "Platform").',
      '1.2. This Privacy Notice describes how We collect, use, store, disclose and '
          'protect information you share while using the Platform. We maintain '
          'reasonable security standards to secure transactions and your information.',
    ]),
    LegalSection('2. Information We Collect', [
      '2.1. Personal information: your mobile number, delivery address, contact name '
          'and order preferences, used to fulfil grocery deliveries.',
      '2.2. Location data: with your permission, real-time GPS coordinates to show '
          'nearby product catalogues and enable dispatch tracking.',
    ]),
    LegalSection('3. Data Protection & Security', [
      '3.1. All online payments are processed through PCI-DSS certified payment '
          'gateways. FreshCart does not store card numbers on our servers. Your data '
          'is protected using industry-standard encryption.',
    ]),
  ],
);
