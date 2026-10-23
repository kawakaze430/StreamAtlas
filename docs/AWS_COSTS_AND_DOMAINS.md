# AWS cost/domain decisions (estimates and external links)

Official sources:
- AWS Lightsail instance bundles: https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html
- AWS Lightsail pricing: https://aws.amazon.com/lightsail/pricing/
- Route53 hosted-zone pricing: https://aws.amazon.com/route53/pricing/
- Registering a Route53 domain (credits not usable for registration): https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-register.html
- Domain to CloudFront mapping (for a future compliant architecture): https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-cloudfront-distribution.html
- AWS Acceptable Use Policy: https://aws.amazon.com/aup/

The **private synthetic demo** can start with Lightsail 2GB/60GB **approximately $12/month** in commonly published IPv4 plan tiers, or 4GB/80GB approximately **$24/month** if FFmpeg encoding causes memory pressure. Prices are USD and must be rechecked for the selected Region and taxes. No uptime guarantee is implied, no instance plan has been purchased.

A custom registered domain is **not** automatically free with an AWS instance or Free Tier. Domain registration has a recurring annual price that depends on suffix and availability. A Route53 hosted zone is generally **$0.50/month** for the first 25 zones; some DNS charges or other features may apply. AWS credits **cannot** pay for Route53 registration. Third-party registrars can work too; you can edit A records at their DNS host.

Video streaming usage can consume **much more** than small-instance compute: outbound data, additional volumes/snapshots, backup S3 objects, KMS requests, CDN delivery, logs and taxes may add charges. Lightsail allowances can differ by region and Mumbai-region plans have special lower allowances; monitor egress and set AWS Budgets alerts before testing video traffic.

**Do not select an adult-video hosting provider solely on low price.** Confirm lawful distribution, content-policy eligibility and service-specific restrictions before placing real content on AWS. Privacy-sensitive traffic should remain minimized and encrypted. Never rely on an 18+ checkbox as effective age assurance.
