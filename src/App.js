import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Separated components
const SetSelector = ({ cardSets, selectedSet, onSetChange }) => (
  <div className="set-selector">
    <div className="select-wrapper">
      <select 
        value={selectedSet?.id || ''} 
        onChange={(e) => onSetChange(cardSets.find(set => set.id === e.target.value))}
        className="set-select"
      >
        <option value="" disabled>Select a Pokémon Set</option>
        {cardSets.map(set => (
          <option key={set.id} value={set.id}>
            {set.name} ({set.series})
          </option>
        ))}
      </select>
      <div className="select-arrow">▼</div>
    </div>
  </div>
);

const PackDisplay = ({ selectedSet, onOpenPack }) => (
  <div className="pack-container">
    <div className="pack" onClick={onOpenPack}>
      {selectedSet && (
        <>
          <img 
            src={selectedSet.images.logo} 
            alt={selectedSet.name} 
            className="pack-image"
          />
          <div className="pack-info">
            <h3>{selectedSet.name}</h3>
            <p>{selectedSet.series}</p>
          </div>
        </>
      )}
    </div>
  </div>
);

const CardDisplay = ({ card, index, totalCards, onNextCard }) => (
  <div className="card-reveal-container">
    <div className="current-card-display">
      <div className="card-count">
        Card {index + 1} of {totalCards}
      </div>
      
      <div className="single-card" onClick={onNextCard}>
        <div className="card-flip-container">
          <img 
            src={card.images.large} 
            alt={card.name} 
            className="single-card-image" 
          />
        </div>
        
        <div className="card-info">
          <h3>{card.name}</h3>
          <p className={`rarity ${card.rarity.toLowerCase().replace(/\s+/g, '-')}`}>
            {card.rarity}
          </p>
        </div>
        
        <div className="card-instruction">
          Click or swipe left to reveal next card
        </div>
      </div>
    </div>
  </div>
);

const AllCardsDisplay = ({ cards, onResetPack, isLoading }) => (
  <div className="all-cards-summary">
    <h2>Your Complete Pack</h2>
    <div className="cards-container">
      {cards.map((card, index) => (
        <div 
          key={card.uniqueId} 
          className="card"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <img 
            src={card.images.large} 
            alt={card.name} 
            className="card-image" 
          />
          <div className="card-info">
            <h3>{card.name}</h3>
            <p className={`rarity ${card.rarity.toLowerCase().replace(/\s+/g, '-')}`}>
              {card.rarity}
            </p>
          </div>
        </div>
      ))}
    </div>
    <button 
      className="reset-button" 
      onClick={onResetPack}
      disabled={isLoading}
    >
      Open Another Pack
    </button>
  </div>
);

const LoadingOverlay = () => (
  <div className="loading-overlay">
    <div className="loading-spinner"></div>
    <p>Opening pack...</p>
  </div>
);

// API service functions
const apiService = {
  API_BASE: 'https://api.pokemontcg.io/v2',
  API_KEY: process.env.REACT_APP_POKEMON_TCG_API_KEY,
  
  fetchSets: async function() {
    const response = await axios.get(`${this.API_BASE}/sets`, {
      headers: { 
        'X-Api-Key': this.API_KEY,
        'Content-Type': 'application/json'
      }
    });
    return response.data.data.sort((a, b) => 
      new Date(b.releaseDate) - new Date(a.releaseDate)
    );
  },
  
  fetchCardsByRarity: async function(setId, rarity, count) {
    const response = await axios.get(`${this.API_BASE}/cards`, {
      headers: { 'X-Api-Key': this.API_KEY },
      params: {
        q: `set.id:${setId} rarity:"${rarity}"`,
        pageSize: 100
      }
    });
    
    const cards = response.data.data;
    const selectedCards = [];
    
    for (let i = 0; i < count; i++) {
      if (cards.length > 0) {
        const randomIndex = Math.floor(Math.random() * cards.length);
        selectedCards.push(cards[randomIndex]);
        cards.splice(randomIndex, 1); // Remove selected card to avoid duplicates
      }
    }
    
    return selectedCards;
  }
};

// Main App Component
function App() {
  // State
  const [isOpening, setIsOpening] = useState(false);
  const [cards, setCards] = useState([]);
  const [cardSets, setCardSets] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAllCards, setShowAllCards] = useState(false);
  
  // Load card sets on mount
  useEffect(() => {
    fetchCardSets();
  }, []);
  
  // Handle swipe gestures
  useEffect(() => {
    let touchStartX = 0;
    
    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
    };
    
    const handleTouchEnd = (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
      
      if (diff > 50) {
        showNextCard();
      }
    };
    
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentCardIndex, cards.length]);

  // Methods
  const fetchCardSets = async () => {
    try {
      setError(null);
      const sets = await apiService.fetchSets();
      setCardSets(sets);
      setSelectedSet(sets[0]);
    } catch (error) {
      console.error('Error fetching sets:', error);
      setError(error.response?.data?.message || error.message);
    }
  };

  const openPack = async () => {
    if (!selectedSet) return;
    
    setIsLoading(true);
    
    try {
      // Typical pack distribution
      const commonCards = await apiService.fetchCardsByRarity(selectedSet.id, 'Common', 6);
      const uncommonCards = await apiService.fetchCardsByRarity(selectedSet.id, 'Uncommon', 3);
      
      // Rare slot (with chance for better rarities)
      const rareSlotRandom = Math.random();
      let rareSlotCards = [];
      
      if (rareSlotRandom < 0.02) { // 2% chance for Secret Rare
        rareSlotCards = await apiService.fetchCardsByRarity(selectedSet.id, 'Secret Rare', 1);
      } else if (rareSlotRandom < 0.15) { // 13% chance for Ultra Rare
        rareSlotCards = await apiService.fetchCardsByRarity(selectedSet.id, 'Rare Ultra', 1);
      } else { // 85% chance for regular Rare
        rareSlotCards = await apiService.fetchCardsByRarity(selectedSet.id, 'Rare', 1);
      }

      const allCards = [
        ...commonCards,
        ...uncommonCards,
        ...rareSlotCards
      ].map(card => ({
        ...card,
        uniqueId: `${card.id}-${Math.random()}`
      }));

      setCards(allCards);
      setIsOpening(true);
      setCurrentCardIndex(0);
      setShowAllCards(false);
    } catch (error) {
      console.error('Error opening pack:', error);
      setError(error.response?.data?.message || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const showNextCard = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      setShowAllCards(true);
    }
  };

  const resetPack = () => {
    setIsOpening(false);
    setCards([]);
    setCurrentCardIndex(0);
    setShowAllCards(false);
  };

  return (
    <div className="app">
      <h1>Pokémon Pack Simulator</h1>
      
      {error && <div className="error-message">Error: {error}</div>}
      
      <SetSelector 
        cardSets={cardSets} 
        selectedSet={selectedSet} 
        onSetChange={setSelectedSet} 
      />

      {!isOpening ? (
        <PackDisplay selectedSet={selectedSet} onOpenPack={openPack} />
      ) : (
        <>
          {!showAllCards ? (
            cards[currentCardIndex] && (
              <CardDisplay 
                card={cards[currentCardIndex]} 
                index={currentCardIndex} 
                totalCards={cards.length} 
                onNextCard={showNextCard} 
              />
            )
          ) : (
            <AllCardsDisplay 
              cards={cards} 
              onResetPack={resetPack} 
              isLoading={isLoading} 
            />
          )}
        </>
      )}

      {isLoading && <LoadingOverlay />}
    </div>
  );
}

export default App;
