const { validateVoiceChannel } = require('../../src/utils/voiceValidator');
const discordPlayer = require('discord-player');

jest.mock('discord-player');

describe('Voice Validator', () => {
    let mockInteraction;
    let mockQueue;

    beforeEach(() => {
        jest.clearAllMocks();
        mockInteraction = {
            member: { voice: { channel: null } },
            guild: { id: 'guild_123', members: { me: { voice: { channel: null } } } },
            editReply: jest.fn().mockResolvedValue(true)
        };
        mockQueue = {
            delete: jest.fn()
        };
        discordPlayer.useQueue.mockReturnValue(mockQueue);
    });

    test('fails if user is not in a voice channel', async () => {
        const result = await validateVoiceChannel(mockInteraction);
        
        expect(result).toBe(false);
        expect(mockInteraction.editReply).toHaveBeenCalledWith({ content: expect.stringContaining('❌') });
    });

    test('passes successfully if user is in VC and bot is unassigned', async () => {
        mockInteraction.member.voice.channel = { id: 'vc_1' };
        // bot remains unassigned
        
        const result = await validateVoiceChannel(mockInteraction);
        
        expect(result).toBe(true);
        expect(mockInteraction.editReply).not.toHaveBeenCalled();
    });

    test('clears queue and passes if user is in VC1 and bot was in VC2', async () => {
        mockInteraction.member.voice.channel = { id: 'vc_user' };
        mockInteraction.guild.members.me.voice.channel = { id: 'vc_bot_old' };
        
        const result = await validateVoiceChannel(mockInteraction);
        
        expect(result).toBe(true);
        expect(discordPlayer.useQueue).toHaveBeenCalledWith('guild_123');
        expect(mockQueue.delete).toHaveBeenCalled();
        expect(mockInteraction.editReply).toHaveBeenCalledWith({ content: expect.stringContaining('Leaving that channel')});
    });

    test('passes cleanly if user and bot are in the SAME channel', async () => {
        mockInteraction.member.voice.channel = { id: 'vc_shared' };
        mockInteraction.guild.members.me.voice.channel = { id: 'vc_shared' };
        
        const result = await validateVoiceChannel(mockInteraction);
        
        expect(result).toBe(true);
        expect(mockQueue.delete).not.toHaveBeenCalled();
    });
});
