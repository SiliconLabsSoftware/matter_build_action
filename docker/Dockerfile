# Stage 1: Build dependencies and download SDKs/tools
FROM ghcr.io/project-chip/chip-build:${VERSION} AS build
LABEL org.opencontainers.image.source https://github.com/project-chip/connectedhomeip

RUN git clone https://github.com/SiliconLabsSoftware/matter_extension.git /opt/matter_extension \
    && git submodule update --init \
    && : # last line

ENV MATTER_ROOT=/opt/matter_extension