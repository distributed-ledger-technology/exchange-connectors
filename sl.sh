
curl https://api-testnet.bybit.com/private/linear/position/trading-stop \
-H "Content-Type: application/json" \
-d '{"api_key":"{api_key}","symbol":"BTCUSDT","side":"Buy","take_profit":10,"timestamp":{timestamp},"sign":"{sign}"}'