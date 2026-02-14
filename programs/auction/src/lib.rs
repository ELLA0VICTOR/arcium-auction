use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;

declare_id!("AucBLdAuct1on11111111111111111111111111111");

#[program]
pub mod auction {
    use super::*;

    /// Initialize a new blind auction with Arcium encryption
    /// 
    /// This creates an on-chain auction account that will store:
    /// - Auction metadata (item name, description)
    /// - Minimum bid amount
    /// - End timestamp
    /// - Creator's public key
    /// - Arcium MXE public key for encryption
    pub fn create_auction(
        ctx: Context<CreateAuction>,
        item_name: String,
        description: String,
        min_bid: u64,
        end_time: i64,
        arcium_mxe_pubkey: [u8; 32], // Arcium cluster public key for encryption
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(
            end_time > clock.unix_timestamp,
            AuctionError::InvalidEndTime
        );
        require!(min_bid > 0, AuctionError::InvalidMinBid);
        require!(
            item_name.len() <= 64,
            AuctionError::ItemNameTooLong
        );
        require!(
            description.len() <= 256,
            AuctionError::DescriptionTooLong
        );

        auction.creator = ctx.accounts.creator.key();
        auction.item_name = item_name;
        auction.description = description;
        auction.min_bid = min_bid;
        auction.end_time = end_time;
        auction.created_at = clock.unix_timestamp;
        auction.status = AuctionStatus::Active;
        auction.bid_count = 0;
        auction.arcium_mxe_pubkey = arcium_mxe_pubkey;
        auction.bump = ctx.bumps.auction;

        msg!("Auction created with Arcium MXE pubkey");
        Ok(())
    }

    /// Submit an encrypted bid using Arcium encryption
    /// 
    /// The bid amount is encrypted client-side using:
    /// 1. x25519 key exchange with auction's MXE public key
    /// 2. Rescue cipher for symmetric encryption
    /// 
    /// Only the encrypted data is stored on-chain. The actual bid amount
    /// remains hidden until MPC computation reveals the winner.
    pub fn submit_bid(
        ctx: Context<SubmitBid>,
        encrypted_bid_data: Vec<u8>, // Rescue cipher output
        bidder_pubkey: [u8; 32],      // Ephemeral x25519 public key
        nonce: [u8; 16],               // Encryption nonce
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let bid = &mut ctx.accounts.bid;
        let clock = Clock::get()?;

        // Validate auction is still active
        require!(
            auction.status == AuctionStatus::Active,
            AuctionError::AuctionNotActive
        );
        require!(
            clock.unix_timestamp < auction.end_time,
            AuctionError::AuctionEnded
        );

        // Validate encrypted data
        require!(
            encrypted_bid_data.len() == 32,
            AuctionError::InvalidEncryptedData
        );
        require!(
            bidder_pubkey.len() == 32,
            AuctionError::InvalidPublicKey
        );
        require!(
            nonce.len() == 16,
            AuctionError::InvalidNonce
        );

        // Store encrypted bid
        bid.auction = auction.key();
        bid.bidder = ctx.accounts.bidder.key();
        bid.encrypted_data = encrypted_bid_data;
        bid.x25519_pubkey = bidder_pubkey;
        bid.nonce = nonce;
        bid.timestamp = clock.unix_timestamp;
        bid.bump = ctx.bumps.bid;

        // Increment auction bid count
        auction.bid_count = auction.bid_count.checked_add(1).unwrap();

        msg!(
            "Encrypted bid submitted - Bidder: {}, Auction: {}",
            ctx.accounts.bidder.key(),
            auction.key()
        );

        Ok(())
    }

    /// Finalize auction and reveal winner via Arcium MPC
    /// 
    /// This instruction would normally trigger:
    /// 1. Arcium MXE nodes fetch all encrypted bids
    /// 2. MPC computation determines winner without decrypting individual bids
    /// 3. Callback instruction writes winner data on-chain
    /// 
    /// For demo: We store the MPC computation request and result
    pub fn finalize_auction(
        ctx: Context<FinalizeAuction>,
        winner_pubkey: Pubkey,
        winning_bid_amount: u64,
        mpc_computation_id: String,
    ) -> Result<()> {
        let auction = &mut ctx.accounts.auction;
        let clock = Clock::get()?;

        require!(
            auction.status == AuctionStatus::Active,
            AuctionError::AuctionNotActive
        );
        require!(
            clock.unix_timestamp >= auction.end_time,
            AuctionError::AuctionNotEnded
        );
        require!(
            ctx.accounts.authority.key() == auction.creator,
            AuctionError::UnauthorizedFinalizer
        );
        require!(
            winning_bid_amount >= auction.min_bid,
            AuctionError::WinningBidTooLow
        );

        auction.status = AuctionStatus::Finalized;
        auction.winner = Some(winner_pubkey);
        auction.winning_bid = Some(winning_bid_amount);
        auction.mpc_computation_id = Some(mpc_computation_id);
        auction.finalized_at = Some(clock.unix_timestamp);

        msg!(
            "Auction finalized - Winner: {}, Amount: {}",
            winner_pubkey,
            winning_bid_amount
        );

        Ok(())
    }

    /// Cancel auction (only if no bids submitted)
    pub fn cancel_auction(ctx: Context<CancelAuction>) -> Result<()> {
        let auction = &mut ctx.accounts.auction;

        require!(
            ctx.accounts.creator.key() == auction.creator,
            AuctionError::UnauthorizedCancellation
        );
        require!(
            auction.status == AuctionStatus::Active,
            AuctionError::AuctionNotActive
        );
        require!(
            auction.bid_count == 0,
            AuctionError::CannotCancelWithBids
        );

        auction.status = AuctionStatus::Cancelled;

        msg!("Auction cancelled by creator");
        Ok(())
    }
}

// ============================================================================
// Account Structures
// ============================================================================

#[derive(Accounts)]
#[instruction(item_name: String)]
pub struct CreateAuction<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Auction::INIT_SPACE,
        seeds = [b"auction", creator.key().as_ref(), item_name.as_bytes()],
        bump
    )]
    pub auction: Account<'info, Auction>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitBid<'info> {
    #[account(mut)]
    pub auction: Account<'info, Auction>,

    #[account(
        init,
        payer = bidder,
        space = 8 + Bid::INIT_SPACE,
        seeds = [
            b"bid",
            auction.key().as_ref(),
            bidder.key().as_ref(),
            &auction.bid_count.to_le_bytes()
        ],
        bump
    )]
    pub bid: Account<'info, Bid>,

    #[account(mut)]
    pub bidder: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeAuction<'info> {
    #[account(mut)]
    pub auction: Account<'info, Auction>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelAuction<'info> {
    #[account(mut)]
    pub auction: Account<'info, Auction>,

    pub creator: Signer<'info>,
}

// ============================================================================
// Data Structures
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct Auction {
    /// Creator's public key
    pub creator: Pubkey,

    /// Item being auctioned
    #[max_len(64)]
    pub item_name: String,

    /// Description of the item
    #[max_len(256)]
    pub description: String,

    /// Minimum bid amount in lamports
    pub min_bid: u64,

    /// Auction end timestamp
    pub end_time: i64,

    /// Auction creation timestamp
    pub created_at: i64,

    /// Current status
    pub status: AuctionStatus,

    /// Total number of bids
    pub bid_count: u64,

    /// Arcium MXE cluster public key (for client-side encryption)
    pub arcium_mxe_pubkey: [u8; 32],

    /// Winner's public key (revealed after finalization)
    pub winner: Option<Pubkey>,

    /// Winning bid amount (revealed after finalization)
    pub winning_bid: Option<u64>,

    /// MPC computation ID from Arcium
    #[max_len(64)]
    pub mpc_computation_id: Option<String>,

    /// Finalization timestamp
    pub finalized_at: Option<i64>,

    /// PDA bump
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Bid {
    /// Reference to auction
    pub auction: Pubkey,

    /// Bidder's wallet public key
    pub bidder: Pubkey,

    /// Encrypted bid data (output of Rescue cipher)
    /// Contains the encrypted bid amount
    pub encrypted_data: Vec<u8>,

    /// Ephemeral x25519 public key used for encryption
    /// Used in key exchange with Arcium MXE public key
    pub x25519_pubkey: [u8; 32],

    /// Nonce used for Rescue cipher encryption
    pub nonce: [u8; 16],

    /// Submission timestamp
    pub timestamp: i64,

    /// PDA bump
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum AuctionStatus {
    Active,
    Finalized,
    Cancelled,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum AuctionError {
    #[msg("Auction end time must be in the future")]
    InvalidEndTime,

    #[msg("Minimum bid must be greater than 0")]
    InvalidMinBid,

    #[msg("Item name too long (max 64 characters)")]
    ItemNameTooLong,

    #[msg("Description too long (max 256 characters)")]
    DescriptionTooLong,

    #[msg("Auction is not active")]
    AuctionNotActive,

    #[msg("Auction has already ended")]
    AuctionEnded,

    #[msg("Auction has not ended yet")]
    AuctionNotEnded,

    #[msg("Invalid encrypted data length")]
    InvalidEncryptedData,

    #[msg("Invalid x25519 public key")]
    InvalidPublicKey,

    #[msg("Invalid encryption nonce")]
    InvalidNonce,

    #[msg("Unauthorized to finalize this auction")]
    UnauthorizedFinalizer,

    #[msg("Winning bid is below minimum bid")]
    WinningBidTooLow,

    #[msg("Unauthorized to cancel this auction")]
    UnauthorizedCancellation,

    #[msg("Cannot cancel auction with existing bids")]
    CannotCancelWithBids,
}