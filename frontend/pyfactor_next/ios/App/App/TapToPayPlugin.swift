import Foundation
import Capacitor
import StripeTerminal
import ProximityReader

@objc(TapToPayPlugin)
public class TapToPayPlugin: CAPPlugin {
    private var terminal: Terminal?
    private var discoveryListener: DiscoveryListener?
    private var connectionToken: String?
    private var currentPaymentIntent: PaymentIntent?
    
    override public func load() {
        super.load()
        // Initialize Stripe Terminal
        Terminal.setTokenProvider(self)
    }
    
    @objc func checkSupport(_ call: CAPPluginCall) {
        // Check if device supports Tap to Pay
        guard #available(iOS 16.4, *) else {
            call.resolve([
                "supported": false,
                "reason": "iOS 16.4 or later required"
            ])
            return
        }
        
        // Check if ProximityReader is available
        guard ProximityReader.isSupported else {
            call.resolve([
                "supported": false,
                "reason": "Device does not support Tap to Pay"
            ])
            return
        }
        
        // Check if merchant is configured
        ProximityReader.requestMerchantAuthorization { result, error in
            if let error = error {
                call.resolve([
                    "supported": false,
                    "reason": "Merchant authorization failed: \(error.localizedDescription)"
                ])
                return
            }
            
            call.resolve([
                "supported": true
            ])
        }
    }
    
    @objc func initialize(_ call: CAPPluginCall) {
        guard let accountId = call.getString("accountId") else {
            call.reject("Missing Stripe account ID")
            return
        }
        
        // Initialize with provided account
        self.connectionToken = accountId
        
        // Initialize local reader discovery
        let config = LocalMobileDiscoveryConfiguration()
        self.discoveryListener = LocalReaderListener()
        
        Terminal.shared.discoverReaders(config, delegate: self.discoveryListener!) { error in
            if let error = error {
                call.reject("Failed to discover reader: \(error.localizedDescription)")
                return
            }
            
            call.resolve([
                "success": true
            ])
        }
    }
    
    @objc func acceptPayment(_ call: CAPPluginCall) {
        guard let amount = call.getInt("amount") else {
            call.reject("Missing payment amount")
            return
        }
        
        let currency = call.getString("currency") ?? "usd"
        
        // Create payment intent parameters
        let params = PaymentIntentParameters(
            amount: UInt(amount * 100), // Convert to cents
            currency: currency
        )
        
        // Create payment intent
        Terminal.shared.createPaymentIntent(params) { paymentIntent, error in
            if let error = error {
                call.reject("Failed to create payment intent: \(error.localizedDescription)")
                return
            }
            
            guard let paymentIntent = paymentIntent else {
                call.reject("No payment intent created")
                return
            }
            
            self.currentPaymentIntent = paymentIntent
            
            // Collect payment method using Tap to Pay
            Terminal.shared.collectPaymentMethod(paymentIntent) { paymentIntent, error in
                if let error = error {
                    // Send result back to JavaScript
                    self.bridge?.webView?.evaluateJavaScript(
                        "window.handleTapToPayResult({ success: false, error: '\(error.localizedDescription)' })",
                        completionHandler: nil
                    )
                    return
                }
                
                // Process payment
                Terminal.shared.processPayment(paymentIntent!) { paymentIntent, error in
                    if let error = error {
                        self.bridge?.webView?.evaluateJavaScript(
                            "window.handleTapToPayResult({ success: false, error: '\(error.localizedDescription)' })",
                            completionHandler: nil
                        )
                        return
                    }
                    
                    // Payment successful
                    let result = [
                        "success": true,
                        "paymentIntentId": paymentIntent!.stripeId,
                        "chargeId": paymentIntent!.charges.first?.stripeId ?? "",
                        "last4": paymentIntent!.charges.first?.paymentMethodDetails?.cardPresent?.last4 ?? "",
                        "brand": paymentIntent!.charges.first?.paymentMethodDetails?.cardPresent?.brand ?? ""
                    ]
                    
                    let jsonData = try! JSONSerialization.data(withJSONObject: result)
                    let jsonString = String(data: jsonData, encoding: .utf8)!
                    
                    self.bridge?.webView?.evaluateJavaScript(
                        "window.handleTapToPayResult(\(jsonString))",
                        completionHandler: nil
                    )
                }
            }
        }
    }
    
    @objc func cancelPayment(_ call: CAPPluginCall) {
        if let paymentIntent = currentPaymentIntent {
            Terminal.shared.cancelPaymentIntent(paymentIntent) { _, error in
                if let error = error {
                    call.reject("Failed to cancel: \(error.localizedDescription)")
                    return
                }
                call.resolve()
            }
        } else {
            call.resolve()
        }
    }
}

// MARK: - Terminal Token Provider
extension TapToPayPlugin: ConnectionTokenProvider {
    public func fetchConnectionToken(_ completion: @escaping ConnectionTokenCompletionBlock) {
        // In production, fetch this from your backend
        // For now, return the stored token
        if let token = self.connectionToken {
            completion(token, nil)
        } else {
            let error = NSError(domain: "TapToPay", code: 1, userInfo: [
                NSLocalizedDescriptionKey: "No connection token available"
            ])
            completion(nil, error)
        }
    }
}

// MARK: - Discovery Listener
class LocalReaderListener: NSObject, DiscoveryDelegate {
    func terminal(_ terminal: Terminal, didUpdateDiscoveredReaders readers: [Reader]) {
        // Use the local mobile reader (iPhone itself)
        if let localReader = readers.first(where: { $0.deviceType == .appleBuiltIn }) {
            let connectionConfig = LocalMobileConnectionConfiguration(locationId: "mobile_location")
            
            Terminal.shared.connectLocalMobileReader(localReader, delegate: LocalReaderDelegate(), connectionConfig: connectionConfig) { reader, error in
                if let error = error {
                    print("Failed to connect reader: \(error)")
                } else {
                    print("Connected to local reader")
                }
            }
        }
    }
}

// MARK: - Local Reader Delegate
class LocalReaderDelegate: NSObject, LocalMobileReaderDelegate {
    func localMobileReader(_ reader: Reader, didStartInstallingUpdate update: ReaderSoftwareUpdate, cancelable: Cancelable?) {
        print("Installing reader update...")
    }
    
    func localMobileReader(_ reader: Reader, didReportReaderSoftwareUpdateProgress progress: Float) {
        print("Update progress: \(progress * 100)%")
    }
    
    func localMobileReader(_ reader: Reader, didFinishInstallingUpdate update: ReaderSoftwareUpdate?, error: Error?) {
        if let error = error {
            print("Update failed: \(error)")
        } else {
            print("Update complete")
        }
    }
    
    func localMobileReaderDidAcceptTermsOfService(_ reader: Reader) {
        print("Terms accepted")
    }
}