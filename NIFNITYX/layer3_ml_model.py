#!/usr/bin/env python3
"""
╔════════════════════════════════════════════════════════════════════════════════╗
║  LAYER 3: ML PREDICTOR v6.0 - XGBoost + Deep Learning                        ║
║  File: layer3_ml_model.py                                                     ║
║                                                                                ║
║  MODELS AVAILABLE:                                                             ║
║  1. XGBoost Classifier (Primary - Best for tabular data)                     ║
║  2. Deep Neural Network (PyTorch - If XGBoost unavailable)                   ║
║                                                                                ║
║  KEY FEATURES:                                                                 ║
║  ✅ XGBoost with optimal hyperparameters for trading                         ║
║  ✅ Early stopping to prevent overfitting                                     ║
║  ✅ Feature importance analysis                                               ║
║  ✅ Quality tier classification (High/Medium/Low)                             ║
║  ✅ Detailed prediction explanations                                          ║
║                                                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
import pickle
import os
import warnings
warnings.filterwarnings('ignore')

# Try XGBoost first (best for trading), fallback to PyTorch, then sklearn
try:
    import xgboost as xgb
    USING_XGBOOST = True
    print("✅ Using XGBoost (Optimal for trading predictions)")
except ImportError:
    USING_XGBOOST = False
    print("⚠️  XGBoost not available. Install: pip install xgboost")

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    import torch.optim as optim
    from torch.utils.data import Dataset, DataLoader
    USING_PYTORCH = True
    if not USING_XGBOOST:
        print("✅ Using PyTorch Deep Learning")
except ImportError:
    USING_PYTORCH = False
    if not USING_XGBOOST:
        print("⚠️  PyTorch not available. Install: pip install torch")

if not USING_XGBOOST and not USING_PYTORCH:
    from sklearn.ensemble import GradientBoostingClassifier
    print("✅ Using Sklearn GradientBoosting (Fallback)")


# ═══════════════════════════════════════════════════════════════════════════════
#                    DEEP NEURAL NETWORK (PyTorch)
# ═══════════════════════════════════════════════════════════════════════════════

if USING_PYTORCH:
    class DeepTradingNet(nn.Module):
        """
        Deep Neural Network for Trade Prediction
        Architecture: Input → 256 → 128 → 64 → 32 → 1
        With Batch Normalization and Dropout
        """
        
        def __init__(self, input_size):
            super(DeepTradingNet, self).__init__()
            
            self.fc1 = nn.Linear(input_size, 256)
            self.bn1 = nn.BatchNorm1d(256)
            self.dropout1 = nn.Dropout(0.3)
            
            self.fc2 = nn.Linear(256, 128)
            self.bn2 = nn.BatchNorm1d(128)
            self.dropout2 = nn.Dropout(0.25)
            
            self.fc3 = nn.Linear(128, 64)
            self.bn3 = nn.BatchNorm1d(64)
            self.dropout3 = nn.Dropout(0.2)
            
            self.fc4 = nn.Linear(64, 32)
            self.bn4 = nn.BatchNorm1d(32)
            
            self.output = nn.Linear(32, 1)
        
        def forward(self, x):
            x = F.relu(self.bn1(self.fc1(x)))
            x = self.dropout1(x)
            
            x = F.relu(self.bn2(self.fc2(x)))
            x = self.dropout2(x)
            
            x = F.relu(self.bn3(self.fc3(x)))
            x = self.dropout3(x)
            
            x = F.relu(self.bn4(self.fc4(x)))
            
            x = torch.sigmoid(self.output(x))
            return x
    
    
    class TradeDataset(Dataset):
        def __init__(self, X, y):
            self.X = torch.FloatTensor(X)
            self.y = torch.FloatTensor(y).reshape(-1, 1)
        
        def __len__(self):
            return len(self.X)
        
        def __getitem__(self, idx):
            return self.X[idx], self.y[idx]


# ═══════════════════════════════════════════════════════════════════════════════
#                    ENHANCED ML TRADE PREDICTOR v6.0
# ═══════════════════════════════════════════════════════════════════════════════

class EnhancedMLTradePredictor:
    """
    ML Trade Predictor with XGBoost + Deep Learning
    
    Priority:
    1. XGBoost (Best for tabular trading data)
    2. PyTorch Deep Learning
    3. Sklearn GradientBoosting
    """
    
    def __init__(self, model_path='3layer_results_v5/ml_model_v6.pkl'):
        self.model = None
        self.scaler = None
        self.feature_columns = None
        self.feature_importance = None
        self.is_trained = False
        self.model_path = model_path
        
        # Determine which model to use
        self.using_xgboost = USING_XGBOOST
        self.using_pytorch = USING_PYTORCH and not USING_XGBOOST
        self.using_sklearn = not USING_XGBOOST and not USING_PYTORCH
        
        # Hyperparameters
        if USING_XGBOOST:
            self.xgb_params = {
                'max_depth': 6,
                'learning_rate': 0.05,
                'n_estimators': 500,
                'objective': 'binary:logistic',
                'eval_metric': 'logloss',
                'subsample': 0.8,
                'colsample_bytree': 0.8,
                'min_child_weight': 3,
                'gamma': 0.1,
                'reg_alpha': 0.1,
                'reg_lambda': 1.0,
                'scale_pos_weight': 1.0,  # Will adjust based on data
                'random_state': 42,
                'tree_method': 'hist',
                'early_stopping_rounds': 50
            }
        elif USING_PYTORCH:
            self.num_epochs = 300
            self.batch_size = 64
            self.learning_rate = 0.001
            self.patience = 30
        
        # Quality thresholds
        self.quality_thresholds = {
            'high': 0.65,
            'medium': 0.50,
            'low': 0.35
        }
        
        # Try to load existing model
        if os.path.exists(model_path):
            self.load_model(model_path)
        
        model_type = "XGBoost" if self.using_xgboost else ("PyTorch" if self.using_pytorch else "Sklearn")
        print(f"✅ Layer 3: ML Predictor v6.0 initialized ({model_type})")
        if not self.is_trained:
            print("   ⚠️  Model not trained - will return neutral scores (20/40)")
    
    
    def train_on_live_data(self, ml_files):
        """
        Train model on live collected data
        
        Args:
            ml_files: List of CSV files with live data
        
        Returns:
            bool: Success status
        """
        print("\n" + "="*100)
        print("🤖 TRAINING ML MODEL v6.0 ON LIVE DATA".center(100))
        print("="*100 + "\n")
        
        # Load all data
        print("📊 Loading data...")
        all_data = []
        for path in ml_files:
            if os.path.exists(path):
                df = pd.read_csv(path)
                all_data.append(df)
                year = os.path.basename(path).split('_')[1]
                executed = len(df[df['executed'] == True])
                print(f"   Year {year}: {len(df)} signals, {executed} executed")
        
        if not all_data:
            print("❌ No data loaded!")
            return False
        
        combined = pd.concat(all_data, ignore_index=True)
        
        # Filter to executed trades with outcomes
        trades_only = combined[
            (combined['executed'] == True) & 
            (combined['trade_won'].notna())
        ].copy()
        
        if len(trades_only) < 50:
            print(f"\n❌ Only {len(trades_only)} trades with outcomes!")
            print("   Need at least 50 trades for training.")
            return False
        
        print(f"\n✅ Total: {len(trades_only):,} trades with outcomes\n")
        
        # Define feature columns
        self.feature_columns = [
            # Core technical (15)
            'close', 'atr_pct', 'rsi', 'adx', 'macd', 'macd_hist',
            'bb_position', 'bb_width', 'mom10', 'mom20',
            'dist_ema9', 'dist_ema21', 'dist_ema50',
            'trend_up', 'trend_down',
            
            # State (6)
            'drawdown_pct', 'daily_trades', 'portfolio_heat',
            'win_streak', 'loss_streak', 'recent_win_rate',
            
            # Time (2)
            'hour', 'day_of_week',
            
            # Signal (3)
            'technical_score', 'sentiment_score', 'final_score'
        ]
        
        # Filter to available features
        available = [f for f in self.feature_columns if f in trades_only.columns]
        self.feature_columns = available
        
        print(f"📊 Features: {len(self.feature_columns)}")
        
        # Prepare data
        X = trades_only[self.feature_columns].fillna(0).values
        y = (trades_only['trade_won'] == True).astype(int).values
        
        winners = np.sum(y)
        win_rate = winners / len(y) * 100
        
        print(f"\n📈 Distribution:")
        print(f"   Winners: {winners} ({win_rate:.1f}%)")
        print(f"   Losers:  {len(y) - winners} ({100-win_rate:.1f}%)\n")
        
        # Train/test split (80/20)
        from sklearn.model_selection import train_test_split
        from sklearn.preprocessing import RobustScaler
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y if len(np.unique(y)) > 1 else None
        )
        
        # Scale features
        self.scaler = RobustScaler()
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        print(f"🔧 Training: {len(X_train)} samples | Testing: {len(X_test)} samples\n")
        
        # Train model
        if self.using_xgboost:
            success = self._train_xgboost(X_train_scaled, y_train, X_test_scaled, y_test)
        elif self.using_pytorch:
            success = self._train_pytorch(X_train_scaled, y_train, X_test_scaled, y_test)
        else:
            success = self._train_sklearn(X_train_scaled, y_train, X_test_scaled, y_test)
        
        if not success:
            return False
        
        # Analyze performance
        self._analyze_performance(X_test_scaled, y_test)
        
        # Save model
        print(f"\n💾 Saving model to: {self.model_path}")
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        self.save_model(self.model_path)
        self.is_trained = True
        
        print("\n" + "="*100)
        print("✅ TRAINING COMPLETE!".center(100))
        print("="*100 + "\n")
        
        return True
    
    
    def _train_xgboost(self, X_train, y_train, X_test, y_test):
        """Train XGBoost model"""
        print("🚀 Training XGBoost Classifier...\n")
        
        # Adjust scale_pos_weight for class imbalance
        neg = np.sum(y_train == 0)
        pos = np.sum(y_train == 1)
        self.xgb_params['scale_pos_weight'] = neg / pos if pos > 0 else 1.0
        
        print(f"Hyperparameters:")
        for key, val in self.xgb_params.items():
            if key != 'early_stopping_rounds':
                print(f"   {key}: {val}")
        print()
        
        # Create DMatrix for XGBoost
        dtrain = xgb.DMatrix(X_train, label=y_train)
        dtest = xgb.DMatrix(X_test, label=y_test)
        
        evals = [(dtrain, 'train'), (dtest, 'test')]
        
        # Train with early stopping
        self.model = xgb.train(
            self.xgb_params,
            dtrain,
            num_boost_round=self.xgb_params['n_estimators'],
            evals=evals,
            early_stopping_rounds=self.xgb_params['early_stopping_rounds'],
            verbose_eval=50
        )
        
        # Get feature importance
        importance = self.model.get_score(importance_type='gain')
        self.feature_importance = {self.feature_columns[int(k[1:])]: v 
                                   for k, v in importance.items() if k.startswith('f')}
        
        # Evaluate
        train_pred = self.model.predict(dtrain)
        test_pred = self.model.predict(dtest)
        
        train_acc = np.mean((train_pred > 0.5) == y_train) * 100
        test_acc = np.mean((test_pred > 0.5) == y_test) * 100
        
        print(f"\n📊 Results:")
        print(f"   Train Accuracy: {train_acc:.1f}%")
        print(f"   Test Accuracy:  {test_acc:.1f}%")
        print(f"   Overfit Gap:    {abs(train_acc - test_acc):.1f}%")
        
        # Show top features
        if self.feature_importance:
            sorted_features = sorted(self.feature_importance.items(), key=lambda x: x[1], reverse=True)
            print(f"\n🎯 Top 10 Important Features:")
            for feat, score in sorted_features[:10]:
                print(f"   {feat:20s}: {score:8.1f}")
        
        return True
    
    
    def _train_pytorch(self, X_train, y_train, X_test, y_test):
        """Train PyTorch Deep Learning model"""
        print("🧠 Training Deep Neural Network...\n")
        
        # Create datasets
        train_dataset = TradeDataset(X_train, y_train)
        test_dataset = TradeDataset(X_test, y_test)
        
        train_loader = DataLoader(train_dataset, batch_size=self.batch_size, shuffle=True, drop_last=True)
        test_loader = DataLoader(test_dataset, batch_size=self.batch_size, shuffle=False)
        
        # Initialize model
        self.model = DeepTradingNet(input_size=len(self.feature_columns))
        criterion = nn.BCELoss()
        optimizer = optim.Adam(self.model.parameters(), lr=self.learning_rate, weight_decay=0.0001)
        scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, 'min', patience=10, factor=0.5)
        
        best_test_loss = float('inf')
        best_model_state = None
        patience_counter = 0
        
        print(f"Architecture: {len(self.feature_columns)} → 256 → 128 → 64 → 32 → 1")
        print(f"Epochs: {self.num_epochs} | Batch Size: {self.batch_size} | LR: {self.learning_rate}\n")
        
        print(f"{'Epoch':<8} {'Train Loss':<12} {'Test Loss':<12} {'Test Acc':<12} {'Status'}")
        print("─" * 70)
        
        for epoch in range(1, self.num_epochs + 1):
            # Training
            self.model.train()
            train_loss = 0.0
            for batch_X, batch_y in train_loader:
                optimizer.zero_grad()
                outputs = self.model(batch_X)
                loss = criterion(outputs, batch_y)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
                optimizer.step()
                train_loss += loss.item()
            
            train_loss /= len(train_loader)
            
            # Testing
            self.model.eval()
            test_loss = 0.0
            correct = 0
            total = 0
            
            with torch.no_grad():
                for batch_X, batch_y in test_loader:
                    outputs = self.model(batch_X)
                    loss = criterion(outputs, batch_y)
                    test_loss += loss.item()
                    
                    predicted = (outputs > 0.5).float()
                    correct += (predicted == batch_y).sum().item()
                    total += len(batch_y)
            
            test_loss /= len(test_loader)
            test_acc = correct / total * 100
            
            scheduler.step(test_loss)
            
            # Early stopping
            status = ""
            if test_loss < best_test_loss:
                best_test_loss = test_loss
                best_model_state = self.model.state_dict().copy()
                patience_counter = 0
                status = "✅ Best"
            else:
                patience_counter += 1
                if patience_counter >= self.patience:
                    status = "⏹️  Early stop"
            
            if epoch % 20 == 0 or status:
                print(f"{epoch:<8} {train_loss:<12.4f} {test_loss:<12.4f} {test_acc:<12.1f} {status}")
            
            if patience_counter >= self.patience:
                print(f"\n⏹️  Early stopping at epoch {epoch}")
                break
        
        # Load best model
        if best_model_state:
            self.model.load_state_dict(best_model_state)
        
        return True
    
    
    def _train_sklearn(self, X_train, y_train, X_test, y_test):
        """Train sklearn GradientBoosting"""
        print("🌳 Training Sklearn GradientBoosting...\n")
        
        from sklearn.ensemble import GradientBoostingClassifier
        
        self.model = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            random_state=42
        )
        
        self.model.fit(X_train, y_train)
        
        train_acc = self.model.score(X_train, y_train) * 100
        test_acc = self.model.score(X_test, y_test) * 100
        
        print(f"Train Accuracy: {train_acc:.1f}%")
        print(f"Test Accuracy:  {test_acc:.1f}%")
        
        return True
    
    
    def _analyze_performance(self, X_test, y_test):
        """Analyze model performance"""
        print(f"\n" + "="*100)
        print("📊 PERFORMANCE ANALYSIS".center(100))
        print("="*100 + "\n")
        
        # Get predictions
        if self.using_xgboost:
            dtest = xgb.DMatrix(X_test)
            predictions = self.model.predict(dtest)
        elif self.using_pytorch:
            self.model.eval()
            with torch.no_grad():
                predictions = self.model(torch.FloatTensor(X_test)).numpy().flatten()
        else:
            predictions = self.model.predict_proba(X_test)[:, 1]
        
        # Confidence separation
        winners_conf = predictions[y_test == 1]
        losers_conf = predictions[y_test == 0]
        
        if len(winners_conf) > 0 and len(losers_conf) > 0:
            sep = (np.mean(winners_conf) - np.mean(losers_conf)) * 100
            
            print(f"Confidence Analysis:")
            print(f"   Winners avg: {np.mean(winners_conf)*100:.1f}%")
            print(f"   Losers avg:  {np.mean(losers_conf)*100:.1f}%")
            print(f"   Separation:  {sep:.1f}%")
            
            if sep > 20:
                print(f"\n   ✅ EXCEPTIONAL! Model has strong predictive power.")
            elif sep > 15:
                print(f"\n   ✅ EXCELLENT! Good separation between winners/losers.")
            elif sep > 10:
                print(f"\n   ✅ GOOD! Decent predictive ability.")
            else:
                print(f"\n   ⚠️  FAIR. Weak separation - may need more data/features.")
        
        # Quality tiers
        high_conf = predictions >= self.quality_thresholds['high']
        med_conf = (predictions >= self.quality_thresholds['medium']) & (predictions < self.quality_thresholds['high'])
        low_conf = predictions < self.quality_thresholds['medium']
        
        print(f"\nQuality Tier Analysis:")
        for tier_name, mask in [('HIGH (≥65%)', high_conf), ('MEDIUM (50-65%)', med_conf), ('LOW (<50%)', low_conf)]:
            if np.sum(mask) > 0:
                tier_wr = np.mean(y_test[mask]) * 100
                print(f"   {tier_name:20s}: {np.sum(mask):3d} trades, {tier_wr:5.1f}% win rate")
    
    
    def predict_trade_quality(self, features_dict):
        """
        Predict trade quality
        
        Returns:
            dict with ml_prediction, ml_confidence, ml_score, quality_tier, reason
        """
        if not self.is_trained:
            return {
                'ml_prediction': 1,
                'ml_confidence': 0.5,
                'ml_score': 20.0,
                'quality_tier': 'MEDIUM',
                'reason': 'Model not trained'
            }
        
        try:
            # Extract features
            feature_values = [features_dict.get(col, 0) for col in self.feature_columns]
            X = self.scaler.transform([feature_values])
            
            # Predict
            if self.using_xgboost:
                dmatrix = xgb.DMatrix(X)
                confidence = float(self.model.predict(dmatrix)[0])
            elif self.using_pytorch:
                self.model.eval()
                with torch.no_grad():
                    confidence = float(self.model(torch.FloatTensor(X)).item())
            else:
                confidence = float(self.model.predict_proba(X)[0, 1])
            
            # Classify
            prediction = 1 if confidence > 0.5 else 0
            
            if confidence >= self.quality_thresholds['high']:
                quality_tier = 'HIGH'
            elif confidence >= self.quality_thresholds['medium']:
                quality_tier = 'MEDIUM'
            else:
                quality_tier = 'LOW'
            
            ml_score = confidence * 40  # Scale to 0-40
            
            reason = f"{confidence*100:.1f}% confidence ({quality_tier})"
            
            return {
                'ml_prediction': int(prediction),
                'ml_confidence': float(confidence),
                'ml_score': float(ml_score),
                'quality_tier': quality_tier,
                'reason': reason
            }
        
        except Exception as e:
            print(f"⚠️  Prediction error: {e}")
            return {
                'ml_prediction': 1,
                'ml_confidence': 0.5,
                'ml_score': 20.0,
                'quality_tier': 'MEDIUM',
                'reason': f'Error: {str(e)}'
            }
    
    
    def save_model(self, path):
        """Save model"""
        save_data = {
            'scaler': self.scaler,
            'feature_columns': self.feature_columns,
            'feature_importance': self.feature_importance,
            'using_xgboost': self.using_xgboost,
            'using_pytorch': self.using_pytorch,
            'quality_thresholds': self.quality_thresholds
        }
        
        if self.using_xgboost:
            # Save XGBoost separately
            xgb_path = path.replace('.pkl', '_xgb.json')
            self.model.save_model(xgb_path)
            save_data['xgb_path'] = xgb_path
        elif self.using_pytorch:
            save_data['model_state'] = self.model.state_dict()
            save_data['input_size'] = len(self.feature_columns)
        else:
            save_data['model'] = self.model
        
        with open(path, 'wb') as f:
            pickle.dump(save_data, f)
        
        print(f"   ✅ Model saved successfully")
    
    
    def load_model(self, path):
        """Load model"""
        try:
            with open(path, 'rb') as f:
                data = pickle.load(f)
            
            self.scaler = data['scaler']
            self.feature_columns = data['feature_columns']
            self.feature_importance = data.get('feature_importance')
            self.using_xgboost = data.get('using_xgboost', False)
            self.using_pytorch = data.get('using_pytorch', False)
            self.quality_thresholds = data.get('quality_thresholds', {'high': 0.65, 'medium': 0.50, 'low': 0.35})
            
            if self.using_xgboost and USING_XGBOOST:
                xgb_path = data.get('xgb_path')
                if xgb_path and os.path.exists(xgb_path):
                    self.model = xgb.Booster()
                    self.model.load_model(xgb_path)
                    self.is_trained = True
                    print(f"   ✅ Loaded XGBoost model")
            elif self.using_pytorch and USING_PYTORCH:
                input_size = data.get('input_size', len(self.feature_columns))
                self.model = DeepTradingNet(input_size)
                self.model.load_state_dict(data['model_state'])
                self.model.eval()
                self.is_trained = True
                print(f"   ✅ Loaded PyTorch model")
            else:
                self.model = data['model']
                self.is_trained = True
                print(f"   ✅ Loaded Sklearn model")
        
        except Exception as e:
            print(f"   ⚠️  Could not load model: {e}")
            self.is_trained = False